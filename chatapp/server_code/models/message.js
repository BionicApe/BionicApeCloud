const {Sequelize, DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const message = sequelize.define("message", {
   text: {
     type: DataTypes.STRING,
     allowNull: false
   }
  },
  {
    timestamps: true,
  });
  return message;
};