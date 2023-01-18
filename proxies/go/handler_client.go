package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	devcycle "github.com/devcyclehq/go-server-sdk"
)

type clientRequestBodyOptions struct {
	ConfigCDNURI            string        `json:"configCDNURI"`
	EventsAPIURI            string        `json:"eventsAPIURI"`
	EnableEdgeDB            bool          `json:"enableEdgeDB"`
	ConfigPollingIntervalMS time.Duration `json:"configPollingIntervalMS"`
	EventFlushIntervalMS    time.Duration `json:"eventFlushIntervalMS"`
	EnableCloudBucketing    bool          `json:"enableCloudBucketing"`
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
	var onInitializedChannel chan bool
	if !reqBody.WaitForInitialization {
		onInitializedChannel = make(chan bool)
	}

	options := devcycle.DVCOptions{
		ConfigCDNURI:            reqBody.Options.ConfigCDNURI,
		EventsAPIURI:            reqBody.Options.EventsAPIURI,
		EnableEdgeDB:            reqBody.Options.EnableEdgeDB,
		ConfigPollingIntervalMS: reqBody.Options.ConfigPollingIntervalMS,
		EventFlushIntervalMS:    reqBody.Options.EventFlushIntervalMS,
		EnableCloudBucketing:    reqBody.EnableCloudBucketing,
		OnInitializedChannel:    onInitializedChannel,
	}

	var res clientResponseBody
	client, err := devcycle.NewDVCClient(reqBody.SdkKey, &options)
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
