const sequelize = require("../config/db");
const {DataTypes, Model} = require("sequelize");
const Booking = require("./booking.model");

const Kyc = sequelize.define('Kyc',{
    id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("Freelancer", "Company"),
    allowNull: false,
  },

  // Common
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  mobile: DataTypes.STRING,
  gstNumber: DataTypes.STRING,

  // Freelancer fields
  idFront: DataTypes.STRING,
  idBack: DataTypes.STRING,
  pan: DataTypes.STRING,
  photo: DataTypes.STRING,
  paymentScreenshot: DataTypes.STRING,

  // Company fields
  companyName: DataTypes.STRING,
  certificateOfIncorporation: DataTypes.STRING,
  companyPAN: DataTypes.STRING,
  directorName: DataTypes.STRING,
  din: DataTypes.STRING,

  // Director KYC (sub of company)
  directorPAN: DataTypes.STRING,
  directorPhoto: DataTypes.STRING,
  directorIdFront: DataTypes.STRING,
  directorIdBack: DataTypes.STRING,
  directorPaymentProof: DataTypes.STRING,
},
{

   tableName:"kyc_details",
   timestamps:true
});


module.exports = Kyc;