const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuItem = sequelize.define('MenuItem', {
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  image:       { type: DataTypes.STRING },
  available:   { type: DataTypes.BOOLEAN, defaultValue: true },
  CategoryId:  { type: DataTypes.INTEGER },
});

module.exports = MenuItem;
