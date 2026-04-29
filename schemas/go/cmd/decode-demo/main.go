// decode-demo subscribes to the catalog.events NSQ topic, decodes each
// message as a CloudEvent, and (for namespace Resources) prints the
// Temporal -> Pulumi plan that the production ops-controller would run.
//
// This is illustrative — it's not the production controller.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	cloudevents "github.com/cloudevents/sdk-go/v2"
	nsq "github.com/nsqio/go-nsq"

	"github.com/backstage-local/catalog-events-demo/pkg/catalogevents"
)

func main() {
	topic := envOr("OPS_TOPIC", "catalog.events")
	channel := envOr("OPS_CHANNEL", "ops-controller-go")
	lookupd := strings.TrimPrefix(
		strings.TrimPrefix(envOr("OPS_LOOKUPD", "http://localhost:4161"), "http://"),
		"https://",
	)

	cfg := nsq.NewConfig()
	consumer, err := nsq.NewConsumer(topic, channel, cfg)
	if err != nil {
		log.Fatalf("new consumer: %v", err)
	}
	consumer.AddHandler(nsq.HandlerFunc(handle))

	if err := consumer.ConnectToNSQLookupd(lookupd); err != nil {
		log.Fatalf("connect lookupd: %v", err)
	}
	log.Printf("decode-demo started: lookupd=%s topic=%s channel=%s", lookupd, topic, channel)

	// Block until Ctrl-C.
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Printf("shutting down")
	consumer.Stop()
	<-consumer.StopChan
}

func handle(msg *nsq.Message) error {
	ev := cloudevents.NewEvent()
	if err := json.Unmarshal(msg.Body, &ev); err != nil {
		log.Printf("drop: not a CloudEvent: %v", err)
		return nil // swallow — nothing we can do, don't requeue
	}
	if err := ev.Validate(); err != nil {
		log.Printf("drop: invalid CloudEvent %s: %v", ev.ID(), err)
		return nil
	}

	var data catalogevents.Data
	if err := ev.DataAs(&data); err != nil {
		log.Printf("drop: cannot decode data for %s: %v", ev.ID(), err)
		return nil
	}

	log.Printf("event %s %s (kind=%s specType=%s)",
		ev.Type(), ev.Subject(), data.Kind, data.SpecType)

	if strings.HasPrefix(ev.Type(), "io.backstage.catalog.entity.") &&
		data.Kind == "Resource" && data.SpecType == "namespace" {
		dispatchNamespace(ev, data)
	}
	return nil
}

func dispatchNamespace(ev cloudevents.Event, data catalogevents.Data) {
	entity := data.Entity
	if entity == nil {
		entity = data.PreviousEntity
	}
	if entity == nil {
		log.Printf("namespace event %s has no entity payload, skipping", ev.ID())
		return
	}
	ann := entity.Metadata.Annotations
	name := entity.Metadata.Name
	cluster := orDefault(ann["ops.backstage.io/cluster"], "dev-use1")
	cpu := orDefault(ann["ops.backstage.io/quota-cpu"], "4")
	mem := orDefault(ann["ops.backstage.io/quota-memory"], "8Gi")
	owner := entity.Spec.Owner

	op := map[string]string{
		catalogevents.TypeAdded:   "CreateNamespace",
		catalogevents.TypeChanged: "ReconcileNamespace",
		catalogevents.TypeRemoved: "DecommissionNamespace",
	}[ev.Type()]

	workflowID := fmt.Sprintf("namespace-%s-%s", cluster, name)

	log.Printf("--- namespace event ---")
	log.Printf("  ce.id:      %s", ev.ID())
	log.Printf("  ce.type:    %s", ev.Type())
	log.Printf("  ce.subject: %s", ev.Subject())
	log.Printf("  would start Temporal workflow:")
	log.Printf("    workflow:    ops.namespace.%s", op)
	log.Printf("    workflowId:  %s", workflowID)
	log.Printf("    taskQueue:   ops-namespace")
	log.Printf("    args:        {name=%s cluster=%s owner=%s cpu=%s memory=%s}",
		name, cluster, owner, cpu, mem)
	log.Printf("  which would invoke Pulumi automation:")
	log.Printf("    pulumi up --stack ns/%s/%s", cluster, name)
	if op == "DecommissionNamespace" {
		log.Printf("    pulumi destroy --stack ns/%s/%s   # remove all resources", cluster, name)
	} else {
		log.Printf("    resources:")
		log.Printf("      - kubernetes:core/v1:Namespace               %s", name)
		log.Printf("      - kubernetes:rbac.../RoleBinding             %s-admins (owner=%s)", name, owner)
		log.Printf("      - kubernetes:networking.../NetworkPolicy     %s-default-deny", name)
		log.Printf("      - kubernetes:core/v1:ResourceQuota           %s-quota (cpu=%s, mem=%s)", name, cpu, mem)
		log.Printf("      - kubernetes:core/v1:LimitRange              %s-limits", name)
	}
	log.Printf("-----------------------")
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}
