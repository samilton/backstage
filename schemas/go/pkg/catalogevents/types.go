// Package catalogevents defines the typed view of the catalog event payload
// produced by the Backstage catalog-event-bridge plugin.
//
// Wire format: CloudEvents 1.0 JSON. The CloudEvent envelope (id, source,
// type, subject, time) is handled by github.com/cloudevents/sdk-go; this
// package only describes what lives in the `data` field.
//
// Source of truth for the JSON Schema: schemas/catalog-event-data.schema.json
// at the repo root. Keep this struct in sync with that file (or codegen it
// with go-jsonschema once the schema stops moving).
package catalogevents

const (
	Source = "/backstage/catalog"

	TypeAdded   = "io.backstage.catalog.entity.added"
	TypeChanged = "io.backstage.catalog.entity.changed"
	TypeRemoved = "io.backstage.catalog.entity.removed"

	DataSchemaURI = "https://backstage.local/schemas/catalog-event-data/v1.json"
)

// Data is the payload of a catalog CloudEvent (the `data` field).
type Data struct {
	Kind           string  `json:"kind"`
	SpecType       string  `json:"specType,omitempty"`
	Entity         *Entity `json:"entity,omitempty"`         // omitted on `removed`
	PreviousEntity *Entity `json:"previousEntity,omitempty"` // present on `changed` and `removed`
}

// Entity is a deliberately-loose view of a Backstage entity. We only pull
// out the fields the controller routes on; everything else stays in
// Annotations / Spec for handlers that need it.
type Entity struct {
	APIVersion string   `json:"apiVersion"`
	Kind       string   `json:"kind"`
	Metadata   Metadata `json:"metadata"`
	Spec       Spec     `json:"spec"`
}

type Metadata struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Description string            `json:"description,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type Spec struct {
	Type      string `json:"type,omitempty"`
	Owner     string `json:"owner,omitempty"`
	System    string `json:"system,omitempty"`
	Lifecycle string `json:"lifecycle,omitempty"`
}
