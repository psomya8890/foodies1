const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  quantity:            { type: DataTypes.INTEGER, allowNull: false },
  price:               { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  OrderId:             { type: DataTypes.INTEGER },
  MenuItemId:          { type: DataTypes.INTEGER },
  specialInstructions: { type: DataTypes.STRING },
});

module.exports = OrderItem;
