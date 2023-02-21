var express = require('express');
var bodyParser = require('body-parser')
var app = express();
const { Sequelize, Op } = require('sequelize');

const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://3.76.173.130:3000",
    methods: ["GET", "POST"],
  },
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

const dbHost = "tfbackend.cpzey120vpzx.eu-central-1.rds.amazonaws.com";
const dbName = "tfbackend";
const dbUserName = "admin";
const dbPassword = "Test123!";
const dbDialect = "mysql";
  
const sequelize = new Sequelize(
                     dbName,
                     dbUserName,
                     dbPassword,
                      {
                        host: dbHost,
                        dialect: dbDialect
                      }
                    );
  
sequelize.authenticate().then(() => {
    console.log('Database Connection has been established successfully.');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});
  
const User = require(`${__dirname}/models/user`)(sequelize);
const ChatChannel = require(`${__dirname}/models/chatChannel`)(sequelize);

const UserChatChannels = sequelize.define('UserChatChannels', {}, { timestamps: true });
  
User.belongsToMany(ChatChannel, { through: 'UserChatChannels' });
ChatChannel.belongsToMany(User, { through: 'UserChatChannels' });
  
const Message = require(`${__dirname}/models/message`)(sequelize);
  
Message.belongsTo(ChatChannel);
ChatChannel.hasMany(Message);

Message.belongsTo(User);
User.hasMany(Message);

var responseText = require('./responseMessages');

function generateErrorResponse(text){
  let errorResponse = {
    "error": text,
    "success": false
  }
  return errorResponse
}

function generateSuccessResponse(){
  let successResponse = {    
    "success": true
  }
  return successResponse
}


app.get('/users', (req, res) => {    
  try{  
  User.findAll().then((data) => {
    console.log('Users retreived successfully');
    let successResponse = generateSuccessResponse()
    successResponse["users"] = data
    res.send(successResponse); 
  }).catch((error) => {
     console.error('Database error occured: ', error);     
     res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
  });
}
catch (error){
  res.sendStatus(500);
  return console.log('error',error);
}
})

app.post('/messages', async (req, res) => {
  try{    
    console.log("Request received at messages API - POST method to add a new message called", req.body.text)    
    Message.create(req.body).then((data) => {      
      let emit_message  = {
        "message": data
      }      
      let messegeChannel = "message-"+req.body.chatChannelId.toString()          
      io.emit(messegeChannel, emit_message);
      let successResponse = generateSuccessResponse()
      successResponse["message"] = data     
      res.send(successResponse); 
      console.log("The message has been posted to following socket namespace channel",messegeChannel)
    }).catch((error) => {       
       console.error('Database error occured: ', error);     
       res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
    });    
  }
  catch (error){
    res.sendStatus(500);
    return console.log('error',error);
  }  
})

app.get('/messages', (req, res) => {  
  try{  
    Message.findAll().then((data) => {
      console.log('Messages are retrieved Successfully');
      let successResponse = generateSuccessResponse()
      successResponse["messages"] = data     
      res.send(successResponse);       
    }).catch((error) => {       
      console.error('Database error occured: ', error);     
      res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
   });
  }
  catch (error) {
    res.sendStatus(500);
    return console.log('error',error);
  }
})

app.delete('/messages/:id', (req, res) => { 
  try{ 
  console.error('An API Request received to delete the message : ', req.params.id);
  Message.destroy(    
    {
      where: {
        id: parseInt(req.params.id)
      }
    }
  ).then((data) => {      
    console.log("Message is deleted successfully from the database",data)
    let apiResponse = {
        "info": "Message is deleted successfully from the database",
        "success": true
    }
    res.send(apiResponse); 
  }).catch((error) => {       
    console.error('Database error occured: ', error);     
    res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
 });
}
catch (error){
  res.sendStatus(500);
  return console.log('error',error);
} 
})

app.get('/messages/:chatChannelId', (req, res) => {
  try{ 
  var reqchatChannelId = req.params.chatChannelId
  Message.findAll({
    where: {
      'chatChannelId': reqchatChannelId
    }
}).then((data) => {
    console.log('Messages related to chat Channel are retrieved Successfully');     
    let successResponse = generateSuccessResponse()
    successResponse["messages"] = data     
    res.send(successResponse); 
  }).catch((error) => {       
    console.error('Database error occured: ', error);     
    res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
 });
}
catch (error){
  res.sendStatus(500);
  return console.log('error',error);
} 
})

app.post('/chatChannel', async (req, res) => {
  try{    
    console.log("Request received at chatChannel API - POST method to create a new channel with following information", req.body);
    let requestReceived = req.body;
    let whereCondition = {
      where: {
        'name': requestReceived['name']
      }
    }

    if (requestReceived['type'] === "private") {
      let nameSplitArray = requestReceived['name'].replace("private-", "").split("-");;
      console.log("nameSplitArray",nameSplitArray)
      let name1 = "private-"+nameSplitArray[0]+"-"+nameSplitArray[1]
      let name2 = "private-"+nameSplitArray[1]+"-"+nameSplitArray[0]
      whereCondition = {
        where: {
          'name': { [Op.in]: [name1, name2] }
        }
      }
    }

    ChatChannel.findAll(whereCondition).then((channelData) => {      
      if (channelData.length === 0)
      {
        ChatChannel.create({
          name: requestReceived['name'],
          type: requestReceived['type']
        }).then((data) => {
          console.log('chatChannel has been created successfully');  
          for (let i=0;i<requestReceived['userNames'].length;i++) {
            UserChatChannels.create({     
              'userName': requestReceived['userNames'][i],
              'chatChannelId': data.id,
            }).then((userchanneldata) => {
              console.log('UserChatChannel created successfully');          
            }).catch((error) => {
              console.error('Failed to create UserChatChannel: ', error);
            });  
          }        
          let response = {
            "success": true,
            "info": "chatChannel is created successfully"            
          }
          res.send(response);             
        }).catch((error) => {       
          console.error('Database error occured: ', error);     
          res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
       });    
      }
      else {
        console.log("chatChannel already exists in the database",channelData)
        let response = {
          "success": true,
          "info": "chatChannel already exists in the database"
        }
        res.send(response); 
      }      
    }).catch((error) => {       
      console.error('Database error occured: ', error);     
      res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
   });    
  }
  catch (error){
    res.sendStatus(500);
    return console.log('error',error);
  }
})

app.put('/chatChannel', async (req, res) => {
  try{    
    console.log("Request received at chatChannel API - POST method to create a new channel with following information", req.body);
    let requestReceived = req.body;
    ChatChannel.findAll({
      where: {
        id: requestReceived['chatChannelId']
      }
    }).then((channelData) => { 
      if (channelData.length === 0)
      {        
        res.send(generateErrorResponse(responseText.CHANNEL_ID_NOT_FOUND));               
      }
      else {
        ChatChannel.update(
          {
            'name': requestReceived['name']
          },
          {
            where: { id: requestReceived['chatChannelId'] },
          }
         ).then((data) => {      
          console.log("Chat Channel Name is updated successfully in the database",data)
          let apiResponse = {
              "success": true,
              "info": "Chat Channel Name is updated successfully in the database"
          }
          res.send(apiResponse); 
        }).catch((error) => {
           console.error('Failed to Update the Chat channel Name: ', error);
           res.send(generateErrorResponse(responseText.CHAT_CHANNEL_UPDATE_FAILURE          
            ));  
        });      
      }
    }).catch((error) => {
       res.sendStatus(500);
       console.error('Unable to find ChatChannels: ', error);
    });     
  }
  catch (error){
    res.sendStatus(500);
    return console.log('error',error);
  }
  finally{
    console.log('Message Posted')
  }
})

app.get('/chatChannel', (req, res) => {
  try{

  var reqchatChannelId = req.query.chatChannelId
  var reqUserName = req.query.userName

  let whereCondition = {}

  if (reqchatChannelId != null) {     
     whereCondition = {
      where: {
        'chatChannelId': reqchatChannelId
      }
    }
    UserChatChannels.findAll(whereCondition).then((data) => {      
      console.log("Received a request to get all the Users associated with chatChannelId - ",req.query.reqUserName)      
      let successResponse = generateSuccessResponse()
      successResponse["userChatChannels"] = data     
      res.send(successResponse); 
    }).catch((error) => {
       console.error('Unable to connect to the database: ', error);
       res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
    });
  }

  if (reqUserName != null) {
    console.log("Received a request to get all the chatChannel associated with username - ",req.query.reqUserName)
    whereCondition = {
      where: {
        'userName': reqUserName
      }      
    }

    UserChatChannels.findAll(whereCondition).then((data) => {
      console.log('Database Connection has been established successfully.');
      let channelNames = []
      let channelIds = []
      for (let i=0;i<data.length;i++){       
        channelIds.push(data[i]['chatChannelId'])
        console.log("I",i)
      } 

      ChatChannel.findAll({ where: {
        id: { [Op.in]: channelIds }
       }
      }).then((chatChannelData) => {
        let responseChatChannelData = []
        for (let i=0;i<chatChannelData.length;i++){         
          let temp_data = chatChannelData[i]          
          responseChatChannelData.push(temp_data)          
        } 
        let successResponse = generateSuccessResponse()
        successResponse["userChatChannels"] = responseChatChannelData     
        res.send(successResponse);        
      })      

      console.log("channelNames",channelNames)  
      console.log("channelIds",channelIds)  
        
    }).catch((error) => {
       console.error('Unable to connect to the database: ', error);
       res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
    });
  } 
}
catch (error){
  res.sendStatus(500);
  return console.log('error',error);
}

})

app.put('/chatChannel/user', async (req, res) => {
  try{    
    console.log("Request received at chatChannel API - POST method to create a new channel with following information", req.body);
    let requestReceived = req.body;
    UserChatChannels.findAll({
      where: {
        chatChannelId: requestReceived['chatChannelId']
      }
    }).then((channelData) => { 
      if (channelData.length === 0)
      {
        res.send(generateErrorResponse(responseText.CHANNEL_ID_NOT_FOUND));        
      }
      else {
        UserChatChannels.create({     
          'userName': requestReceived['userName'],
          'chatChannelId': requestReceived['chatChannelId'],
        }).then((data) => {      
          console.log("user is added to Chat Channel",data)
          let apiResponse = {
            "success": true,
            "info": "user is added to chatChannel"
          }
          res.send(apiResponse); 
        }).catch((error) => {
           console.error('Failed to Add the user to Chat channel', error);
           res.send(generateErrorResponse(responseText.DB_EXCEPTION));            
        });      
      }
    }).catch((error) => {
       console.error('Unable to find ChatChannels: ', error);
       res.send(generateErrorResponse(responseText.DB_EXCEPTION)); 
    });     
  }
  catch (error){
    res.sendStatus(500);
    return console.log('error',error);
  }  
})

app.delete('/chatChannel/user', async (req, res) => {
  try{    
    console.log("Request received at chatChannel API - DELETE method to remove a user from a chat channel", req.query);    
    UserChatChannels.destroy({     
      where: { 
        [Op.and]: [
        { 'chatChannelId' : req.query.chatChannelId},
        { 'userName' :  req.query.userName}
        ]
       }
    }).then((data) => {      
      console.log("user is deleted from Chat Channel",data)
      let apiResponse = {
          "success": true,
          "info": "user is deleted from chatChannel"
      }
      res.send(apiResponse); 
    }).catch((error) => {
       console.error('Failed to delete the user from Chat channel', error);
       res.send(generateErrorResponse(responseText.DB_EXCEPTION));       
    });
  }
  catch (error) {
    res.sendStatus(500);
    return console.log('error',error);
  }  
})

app.delete('/chatChannel/:chatChannelId', (req, res) => {
  try{
  var reqchatChannelId = req.params.chatChannelId
  console.log("Request received at chatChannel API - DELETE method to delete a channel", reqchatChannelId);  
  UserChatChannels.destroy({
    where: {
      'chatChannelId': parseInt(reqchatChannelId)
    }
  }).then((channelData) => { 
    console.log("channelData ====>",channelData)   
    ChatChannel.destroy({
        where: {
          id: parseInt(reqchatChannelId)
        }
      }).then((data) => {      
        console.log("Chat channel is deleted successfully",data)
        let apiResponse = {
            "success": true,
            "info": "Chat channel is deleted successfully"
        }
        res.send(apiResponse); 
      }).catch((error) => {
         console.error('Failed to delete the Chat channel', error);
         res.send(generateErrorResponse(responseText.DB_EXCEPTION));         
      });       
  }).catch((error) => {
     console.error('Unable to find ChatChannels: ', error);
     res.send(generateErrorResponse(responseText.DB_EXCEPTION));
  }); 
}
catch (error){
  res.sendStatus(500);
  return console.log('error',error);
}
})

io.on('connection', () =>{
  console.log('a user is connected')
})

server.listen(3001, '0.0.0.0', () => {
  console.log('server is running on port', server.address().port);
});