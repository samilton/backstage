{{/* vim: set filetype=mustache: */}}

{{/*
Expand the name of the chart.
*/}}
{{- define "app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Defining standard labels to be used for all manifests
*/}}
{{- define "standardLabels" -}}
app.kubernetes.io/name: {{ template "app.name" $ }}
app.kubernetes.io/env: {{ .Values.env }}
app.kubernetes.io/version: "{{ .Values.image.tag }}"
app.kubernetes.io/part-of: {{ .Values.labels.partOf }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ template "app.chart" $ }}
{{- end -}}
{{- define "matchLabels" -}}
app.kubernetes.io/name: {{ template "app.name" $ }}
app.kubernetes.io/env: {{ .Values.env }}
{{- end -}}

{{/*
Defining environment variables
*/}}
{{- define "environmentVariables" -}}
- name: LOG_LEVEL
  value: {{ .Values.app.logLevel }}
- name: PORT
  value: "{{ .Values.app.port }}"
{{- end -}}
