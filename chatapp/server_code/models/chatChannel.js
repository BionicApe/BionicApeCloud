const {Sequelize, DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const chatChannel = sequelize.define("chatChannel", {
   name: {
     type: DataTypes.STRING,
     allowNull: false
   },
   type: {
    type: DataTypes.STRING,
    allowNull: false
  }
  },
  {
    timestamps: true,
  });
  return chatChannel;
};