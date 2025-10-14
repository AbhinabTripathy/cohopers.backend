const sequelize = require('../config/db');
const { DataTypes }= require('sequelize');

const Booking = sequelize.define ("Booking",{
    id:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true,
    },
    userId:{
        type:DataTypes.INTEGER,
        allowNull:false,
    },
    spaceId:{
        type:DataTypes.INTEGER,
        allowNull:false,
    },
    date:{
        type:DataTypes.DATEONLY,
        allowNull:false,
    },
    startDate:{
        type:DataTypes.DATEONLY,
        allowNull:false
    },
    endDate:{
        type:DataTypes.DATEONLY,
        allowNull:false,
    },
    amount:{
        type:DataTypes.DECIMAL(10,2),
        allowNull:false
    },
    status:{
        type:DataTypes.ENUM("Pending","Confirm","Rejected"),
        defaultValue:"Pending",
    },
    
},
{
    tableName:"bookings",
    timestamps:true
});


  module.exports = Booking;
