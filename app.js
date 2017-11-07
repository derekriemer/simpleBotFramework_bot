var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send("Hi, Welcome to my test bot. You can ask me for a random number, the date on a given day this week, or the current time.");
});
// Add global LUIS recognizer to bot
var luisAppUrl = process.env.LUIS_APP_URL;
bot.recognizer(new builder.LuisRecognizer(luisAppUrl));

bot.dialog('random number', [
    function (session, args, next) {
        var intent = args.intent;
        session.dialogData.state = {
            nums: [],
            coin : false,
            die : false,
        }
        var nums = builder.EntityRecognizer.findAllEntities(intent.entities, 'builtin.number');
        var coin = builder.EntityRecognizer.findEntity(intent.entities, 'a coin');
        var die = builder.EntityRecognizer.findEntity(intent.entities, 'a dice');
        if(nums.length ==2){
            session.dialogData.state.nums = nums.map((entity) =>parseInt(entity.entity));
            console.log(next);
            next();
        }
        else if(coin){
            console.log('coin');
            session.dialogData.state.nums = [1,2];
            session.dialogData.state.coin = true;
            next();
        }
        else if(die){
            console.log("die");
            session.dialogData.state.nums = [1, 6];
            session.dialogData.state.die = true;
            next();
        }
        else{
            console.log("random ask");
            builder.Prompts.number(session, 'Please enter your first number for me to guess from.');
        }
    },
    function (session, results, next) {
        console.log("second flow");
        var data = session.dialogData.state;
        console.log(data);
        if(data.nums.length >= 2)
            next();
        if (results.response) {
            data.nums =[parseInt(results.response),0];
            builder.Prompts.number(session, 'Please enter your second number for me to guess from.');
        }
    },
    function (session, results) {
        console.log("third step running");
        var data = session.dialogData.state;
        if (results.response) {
            data.nums[1] = parseInt(results.response);
        }
        console.log(data);
        if(data.die)
            session.send("I'm about to role a dice! Please wait while the die is being spun in my hand.");
        else if(data.coin){
            session.send(`Jingle, jingle, shake shake shake,
I've got a coin,
It's not fake fake fake.
Shaking once, shaking twice,
Shaking again.
Watch as I,
Flip it, wow,
50, 50, here we come now!`);
            session.delay(500);
            session.send("shaking, please wait!")
            var coin = Math.round(Math.random()) ? "heads" : "tails";
            session.endDialog(coin);
        }
        else
            session.send("Hold on while I think of a random number.");
        session.delay(data.die ? 2000 : 300);
        //javascript sort doesn't sort int by default. you have to give it a key function.
        data.nums.sort((a,b)=>a-b);
        nums = data.nums;
        console.log(nums,nums[1]-1);
        let randomNumber =     Math.floor(Math.random() * (nums[1] - nums[0] + 1)) + nums[0];
        session.endDialog(`The magic number is ${randomNumber}`);
    }
]).triggerAction({ 
    matches: 'user.random_number',
    confirmPrompt: "This will cancel the random number. Are you sure?" 
}).cancelAction('cancelrandom number', "Okay, random number canceled.", {
    matches: "Utilities.Cancel",
    confirmPrompt: "Are you sure?"
});

bot.dialog('date', [
    function(session, args){
        let date = new Date();
        session.send("Sorry, but I can only display dates in UTC.");
        session.endDialog(`The date is ${date.toDateString()}`);
    }
]).triggerAction({ 
    matches: 'user.date',
});
    
    bot.dialog('time', [
    function(session, args){
        let date = new Date();
        session.send("Sorry, but I can only display times in UTC.");
        session.endDialog(`The time is ${date.toTimeString()}`);
    }
]).triggerAction({ 
    matches: 'user.time',
});