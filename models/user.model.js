const {DataTypes} = require("sequelize");
const sequelize = require ("../config/db");

const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
       
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false
    },
},
{
   tableName: "users", 
   timestamps: true
});

module.exports = User;
