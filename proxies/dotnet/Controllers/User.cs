using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Net;
using DevCycle.SDK.Server.Common.Model;

namespace dotnet.Controllers;

[ApiController]
[Route("[controller]")]
public class UserController : ControllerBase
{
    private readonly ILogger<UserController> _logger;

    public UserController(ILogger<UserController> logger)
    {
        _logger = logger;
    }

    [HttpPost]
    public Object CreateUser([FromBody]ClientRequestUser user)
    {
        try
        {
            var sdkUser = new User(
                user.UserId,
                user.Email,
                user.Name,
                user.Language,
                user.Country,
                user.AppVersion,
                user.AppBuild,
                user.CustomData,
                user.PrivateCustomData,
                user.CreatedDate,
                user.LastSeenDate,
                user.Platform,
                user.PlatformVersion,
                user.DeviceModel,
                user.SdkType,
                user.SdkVersion
            );
            var userId = DataStore.Users.Count;
            DataStore.Users[userId.ToString()] = sdkUser;

            var result = new { entityType = "user", body = sdkUser };

            Response.Headers.Add("Location", "user/" + userId);
            Response.StatusCode = (int)HttpStatusCode.Created;
            return result;
        }
        catch (Exception e)
        {
            return new { exception = e.Message };
        }
    }
}
