const { Sequelize } = require('sequelize');
const chatChannel = require('./models/chatChannel');

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

User.belongsToMany(ChatChannel, { through: 'UserChatChannels' });
ChatChannel.belongsToMany(User, { through: 'UserChatChannels' });

const Message = require(`${__dirname}/models/message`)(sequelize);

Message.belongsTo(ChatChannel);
ChatChannel.hasMany(Message);

Message.belongsTo(User);
User.hasMany(Message);

sequelize.sync();
console.log('Tables are created successfully!');