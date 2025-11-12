const sequelize = require("../config/db");
const {DataTypes, Model} = require("sequelize");
const Booking = require("./booking.model");

const Kyc = sequelize.define('Kyc',{
    id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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

  // Approval status
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
    allowNull: false,
    defaultValue: "Pending",
  },

  // KYC is user-scoped
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Temporarily allow null for migration
    references: {
      model: "users",
      key: "id",
    },
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Temporarily allow null for migration
  }
},
{

   tableName:"kyc_details",
   timestamps:true
});


module.exports = Kyc;