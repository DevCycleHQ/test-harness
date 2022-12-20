using System.Net;
using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Common.Model;
namespace dotnet.Controllers;

[ApiController]
[Route("[controller]")]
public class EventController : ControllerBase
{

    private readonly ILogger<EventController> _logger;

    public EventController(ILogger<EventController> logger)
    {
        _logger = logger;
    }

    [HttpPost]
    public object CreateEvent(EventsRequest eventsRequest)
    {
        try {
            var sdkEvent = new Event(
                eventsRequest.Type, 
                eventsRequest.Target, 
                eventsRequest.Date, 
                eventsRequest.Value, 
                eventsRequest.MetaData
            );
            var eventId = DataStore.Events.Count;
            DataStore.Events[eventId.ToString()] = sdkEvent;
            var result = new {entityType = "event", body = sdkEvent};

            Response.Headers.Add("Location", "event/" + eventId);
            Response.StatusCode = (int)HttpStatusCode.Created;
            return result;
        } catch (Exception e) {
            return new { exception = e.Message };
        }
    }
}