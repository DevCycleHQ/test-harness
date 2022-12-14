using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace dotnet.Controllers;

[ApiController]
[Route("[controller]")]
public class SpecController : ControllerBase
{

    private readonly ILogger<SpecController> _logger;

    public SpecController(ILogger<SpecController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public string Get()
    {
        return JsonConvert.SerializeObject(new {
            name = "DotNet",
            version = "",
            capabilities = new List<string>(){"EdgeDB", "LocalBucketing", "CloudBucketing"}
        });
    }
}
