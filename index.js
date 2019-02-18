const Discord = require("discord.js");
const config = require("./botconfig.json");
const fs = require("fs");
const httpsRequest = require("https");
const HttpRequest = require("request");
const interval = 120000;
const bot = new Discord.Client();
bot.commands = new Discord.Collection();
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "opencad"
});

function writeLog( message, prefix, writeToFile ) {
	if ( !prefix ) {
		prefix = 'Debug'; // By default put [Debug] in front of the message
	}
	writeToFile = typeof writeToFile !== 'undefined' ? writeToFile : true; // Log everything to file by default
	wholeMessage = '[' + prefix + '] ' + message;
	console.log( '  ' + wholeMessage );
	if ( writeToFile === true ) {
		fs.appendFileSync('Bot-Event.log', wholeMessage + '\n' );
	}
}

fs.readdir("./commands/", (err, files) => {
  if (err) writeLog(err);
  let jsfile = files.filter(f => f.split(".").pop() === "js");
  if (jsfile.length <= 0) {
    writeLog("Couldn't find commands!");
    return;
  };
  jsfile.forEach((f, i) =>{
    let props = require(`./commands/${f}`);
    console.log(`${f} loaded!`);
    bot.commands.set(props.help.name, props);
  })
})

con.connect(function(err) {
  if (err) throw err;
  console.log("--Connected to MySQL!--");
});

bot.on('ready', () => {
  writeLog(`${bot.user.username} has started, with ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} guilds.`);
  bot.user.setActivity("bcsdrp.net");

bot.on("message", async message => {
  //if (message.guild.id === ("526514064570974210")) return;
  if (message.author.equals(bot.user)) return;
  if (message.author.id == 423151298796584960 || message.author.id == 286496194765520897 && message.channel.type == "dm") {
		if (message.content == "stop bot!") {
			message.react("✅");
	    bot.destroy()
		}
  };
  if (!message.guild) return;



//Link blacklist
  if (message.content.match(/(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/+[-a-zA-z]+/g)) { //if it contains an invite link
    let msginvite = String(message.content.match(/(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/+[-a-zA-z]+/g));
    msginvite = msginvite.replace(/(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\//g, "");
    message.guild.fetchInvites()
    .then(async invites => {
      if(!message.member.hasPermission("ADMINISTRATOR")) {
        if (inviteguild = invites.find(invite => invite.code == msginvite));
        if (inviteguild) {
          if (!inviteguild.guild == message.guild) {
            message.delete() //delete the message
              .then(message.reply('**Discord Invite link removed :frowning2:**'))
          }
        } else {
          message.delete() //delete the message
            .then(message.reply('**Discord Invite link removed :frowning2:**'))
        }
      }
    })
    .catch(console.error);
  }





//Commands section
  let prefix = config.prefix;
  if (!message.content.startsWith(prefix)) return;

  let msgArray = message.content.split(" ");
  let cmd = msgArray.shift().toLowerCase();
  let args = msgArray;
  let cmdfile = bot.commands.get(cmd.slice(prefix.length));
  if (cmdfile) {cmdfile.run(bot, message, args, writeLog)} else {
    message.react("❌");
    message.delete(6000);
    let msg = message.channel.send("**I did not find that command `"+cmd+"` :frowning2:**\n*Type **"+prefix+"cmd** to view a list of commands!*")
      .then(msg => {msg.delete(8000)});
  };
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var alreadylive = false;
const twitchchn = bot.channels.get(config.twitch.annouceChannel);
setInterval(function(){
  var opt = {
        host: "api.twitch.tv",
        path: "https://api.twitch.tv/kraken/streams/" + config.twitch.channelName,
        headers: {
            "Client-ID": config.twitch.apiID,
            Accept: "application/vnd.twitchtv.v3+json"
        }
  }
  httpsRequest.get(opt, (res) => {
    var body = "";
    res.on("data", (chunk)=>{
        body += chunk;
    });

    res.on("end", ()=>{
        var json;
        try {
            json = JSON.parse(body);
        }
        catch(err){
            writeLog(err);
            return;
        }
        if(json.status == 404 || json.status == 400){
            writeLog("error with request (400/404)");
        }else{
          if (json.stream !== "null" && json.stream !== null) {
            if (!alreadylive){
              if(json.stream.game !== undefined && json.stream.game !== "undefined" && json.stream.game !== "") {game = json.stream.game} else {game = "Unknown"};
              if(json.stream.channel.status !== undefined && json.stream.channel.status !== "") {streamName = json.stream.channel.status} else {streamName = ""};
              if(json.stream.channel.display_name !== undefined && json.stream.channel.display_name !== "undefined" && json.stream.channel.display_name !== "") twitchName = json.stream.channel.display_name;
              if(json.stream.preview.large !== undefined && json.stream.preview.large !== "undefined" && json.stream.preview.large !== "") previewImg = json.stream.preview.large;
              if(json.stream.channel.logo !== undefined && json.stream.channel.logo !== "undefined" && json.stream.channel.logo !== "") {logo = json.stream.channel.logo} else {logo = null};

              let twitchEmbed = new Discord.RichEmbed()
              .setAuthor(twitchName + " is now live on Twitch!", logo, json.stream.channel.url)
              .setColor(6570404)
              .setTitle(streamName)
              .setURL(json.stream.channel.url)
              .setImage(previewImg)
              .setDescription("Playing " + game +"\n[Watch Stream]("+json.stream.channel.url+")")
              .setTimestamp()
              .setFooter("bcsdrp.net")

              twitchchn.send("<" + json.stream.channel.url + "> is now live on Twitch!")
              twitchchn.send(twitchEmbed)
              writeLog(twitchName + " went live.", "TwitchBot" )
              alreadylive = true;
            }
          } else {
            alreadylive = false;
          }
        }
    });
  }).on("error", (err)=>{
      writeLog(err);
  });
	con.query("SELECT * FROM discord_notification", async function (err, result, fields) {
    if (err) throw err;
		if (result[0]) {
			for (var i = 0; i < result.length; i++) {
				notif_id = result[i].id;
				notif_disid = result[i].discord_id;
				notif_msg = result[i].msg;

				//Instert into History
				con.query("INSERT INTO `discord_notification_history`(`id`, `uid`, `discord_id`, `msg`) VALUES ('"+result[i].id+"', '"+result[i].uid+"', '"+result[i].discord_id+"', '"+result[i].msg+"')", function (err, result, fields) {
			    if (err) throw err;
					if (result.affectedRows < 1) {
						// and error occured whilst inserting
						writeLog("Could not insert into discord_notification_history!", "MYSQL Insert")
						return;
					} else {
            //Inserted into history
						con.query("DELETE FROM `discord_notification` WHERE id = "+notif_id, function (err, result, fields) {
					    if (err) throw err;
							if (result.affectedRows < 1) {
								// and error occured whilst inserting
								writeLog("Could not delete entry in discord_notification!(ID: "+notif_id+")", "MYSQL Delete")
								return;
							} else {
                //deleted from original collection.
                notif_user = bot.users.get(notif_disid);
                if (!notif_user) {writeLog("Could not find user "+notif_disid, "Approval CAD System"); return;};
                notif_user.send(notif_msg);
                writeLog("Just send a message to: "+notif_disid+" ("+notif_msg+")", "Approval CAD System")
							}
					  });
					}
			  });
        await sleep(200);
			}
		} else {
      //No user found
		}
  });
},4*60*1000) //every 4 mins

setInterval(function(){
  mainChannel = bot.channels.get(config.statusChannelMain);
  devChannel = bot.channels.get(config.statusChannelDev);
  HttpRequest(
    {
     url: "http://bcsdrp.net:30120/players.json",
		 timeout: 3000,
		 time: true
		},
		function (Error, Response, Body) {
			if (Body == undefined || Body.length == 0 || Body == '"Nothing"') {
        mainChannel.edit({ name: '❌ Main Server - Offline' })
          .catch(console.error);
        return
      } else {
      var players = JSON.parse(Body);
      mainChannel.edit({ name: '✅ Main Server - '+players.length+'/32' })
        .catch(console.error);
      }
	});
  HttpRequest(
    {
     url: "http://bcsdrp.net:30123/players.json",
		 timeout: 3000,
		 time: true
		},
		function (Error, Response, Body) {
			if (Body == undefined || Body.length == 0 || Body == '"Nothing"') {
        devChannel.edit({ name: '❌ Dev Server - Offline' })
          .catch(console.error);
        return
      } else {
      var players = JSON.parse(Body);
      devChannel.edit({ name: '✅ Dev Server - '+players.length+'/64' })
        .catch(console.error);
      }
	});
},5*1000) //every 5 secs
});

bot.on("guildMemberAdd", (member) => {
  if(!member.roles.has(config.visitorRole)) {
    member.addRole(member.guild.roles.get(config.visitorRole)).catch(err => writeLog(err+" in index.js(bot.on'guildMemberAdd')"));
  }
});

bot.on("guildCreate", guild => { //Bot joined new guild
  writeLog(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});
bot.on("guildDelete", guild => { //Bot left a guild
  writeLog(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

bot.on('disconnected', function() {
    setTimeout(function(){writeLog("Disconnected!", "Critical");}, 10000)
});

bot.on('error', (error) => console.log(error));

bot.login(config.token);
