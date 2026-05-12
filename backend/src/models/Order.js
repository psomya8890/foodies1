const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'),
    defaultValue: 'pending',
  },
  total:        { type: DataTypes.DECIMAL(10, 2) },
  address:      { type: DataTypes.TEXT },
  contactName:  { type: DataTypes.STRING },
  contactPhone: { type: DataTypes.STRING },
  latitude:     { type: DataTypes.FLOAT },
  longitude:    { type: DataTypes.FLOAT },
  UserId:       { type: DataTypes.INTEGER },
  // Status timestamps
  confirmedAt:       { type: DataTypes.DATE },
  preparingAt:       { type: DataTypes.DATE },
  outForDeliveryAt:  { type: DataTypes.DATE },
  deliveredAt:       { type: DataTypes.DATE },
  // ETA fields (in minutes)
  prepTime:          { type: DataTypes.INTEGER, defaultValue: 10 },
  riderTime:         { type: DataTypes.INTEGER, defaultValue: 15 },
  // New fields
  rejectionReason: { type: DataTypes.STRING },
  cancelledAt:     { type: DataTypes.DATE },
  rating:          { type: DataTypes.INTEGER },  // 1-5
  review:          { type: DataTypes.TEXT },
  couponCode:      { type: DataTypes.STRING },
  discount:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  specialNote:     { type: DataTypes.TEXT },
});

module.exports = Order;
