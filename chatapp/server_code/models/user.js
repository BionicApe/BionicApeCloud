const {Sequelize, DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define("user", {
   name: {
     type: DataTypes.STRING,
     allowNull: false,
     primaryKey: true
   },
   cognito_id: {
     type: DataTypes.STRING,
     allowNull: false
   },
   email_id: {
     type: DataTypes.STRING,
   }
  },
  {
    timestamps: false,
  });
  return User;
};