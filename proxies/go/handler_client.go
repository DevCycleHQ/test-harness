package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	devcycle "github.com/devcyclehq/go-server-sdk"
)

type clientRequestBodyOptions struct {
	ConfigCDNURI            string `json:"configCDNURI"`
	EventsAPIURI            string `json:"eventsAPIURI"`
	EnableEdgeDB            bool   `json:"enableEdgeDB"`
	ConfigPollingIntervalMS int64  `json:"configPollingIntervalMS"`
	EventFlushIntervalMS    int64  `json:"eventFlushIntervalMS"`
	EnableCloudBucketing    bool   `json:"enableCloudBucketing"`
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
		ConfigCDNURI:            reqBody.Options.ConfigCDNURI,
		EventsAPIURI:            reqBody.Options.EventsAPIURI,
		EnableEdgeDB:            reqBody.Options.EnableEdgeDB,
		ConfigPollingIntervalMS: time.Duration(reqBody.Options.ConfigPollingIntervalMS * 1000000),
		EventFlushIntervalMS:    time.Duration(reqBody.Options.EventFlushIntervalMS * 1000000),
		EnableCloudBucketing:    reqBody.EnableCloudBucketing,
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
		w.Header().Set("Content-Type", "application/json")
		w.Header().Add("Location", "client/"+reqBody.ClientId)
		w.WriteHeader(http.StatusCreated)
	}

	json.NewEncoder(w).Encode(res)
}
