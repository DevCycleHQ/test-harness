package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	devcycle "github.com/devcyclehq/go-server-sdk"
)

type clientRequestBodyOptions struct {
	ConfigCDNOverride   string        `json:"configCDNURI"`
	EventsAPIOverride   string        `json:"eventsAPIURI"`
	EnableEdgeDB        bool          `json:"enableEdgeDB"`
	PollingInterval     time.Duration `json:"configPollingIntervalMS"`
	EventsFlushInterval time.Duration `json:"eventFlushIntervalMS"`
}

type clientRequestBody struct {
	ClientId              string                   `json:"clientId"`
	SdkKey                string                   `json:"sdkKey,omitempty"`
	EnableCloudBucketing  bool                     `json:"enableCloudBucketing"`
	WaitForInitialization bool                     `json:"waitForInitialization"`
	Options               clientRequestBodyOptions `json:"options"`
}

type clientResponseBody struct {
	Message    string `json:"message,omitempty"`
	AsyncError string `json:"asyncError,omitempty"`
	Exception  string `json:"exception,omitempty"`
}

func clientHandler(w http.ResponseWriter, r *http.Request) {
	var reqBody clientRequestBody
	err := json.NewDecoder(r.Body).Decode(&reqBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	} else if reqBody.ClientId == "" {
		http.Error(w, "Invalid request: missing clientId", http.StatusBadRequest)
		return
	}

	options := devcycle.DVCOptions{
		ConfigCDNOverride:     reqBody.Options.ConfigCDNOverride,
		EventsAPIOverride:     reqBody.Options.EventsAPIOverride,
		EnableEdgeDB:          reqBody.Options.EnableEdgeDB,
		PollingInterval:       reqBody.Options.PollingInterval,
		EventsFlushInterval:   reqBody.Options.EventsFlushInterval,
		DisableLocalBucketing: reqBody.EnableCloudBucketing,
	}

	var lb *devcycle.DevCycleLocalBucketing
	var res clientResponseBody
	if options.DisableLocalBucketing == false {
		lb, err = devcycle.InitializeLocalBucketing(reqBody.SdkKey, &options)
		if err != nil {
			res.Exception = err.Error()
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(res)
			return
		}
	}
	client, err := devcycle.NewDVCClient(reqBody.SdkKey, &options, lb)
	if err != nil {
		res.Exception = err.Error()
		w.WriteHeader(http.StatusOK)
	} else {
		res.Message = "success"
		datastore.clients[reqBody.ClientId] = *client
		auth := context.WithValue(context.Background(), devcycle.ContextAPIKey, devcycle.APIKey{
			Key: reqBody.SdkKey,
		})

		datastore.clientAuthContexts[reqBody.ClientId] = auth
		w.WriteHeader(http.StatusCreated)
	}
	w.Header().Set("Location", "client/"+reqBody.ClientId)
	json.NewEncoder(w).Encode(res)
}
