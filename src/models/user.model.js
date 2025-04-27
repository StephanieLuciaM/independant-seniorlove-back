import { Model, DataTypes } from "sequelize";
import { sequelize } from '../config/database.js';

export class User extends Model{};

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    //allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate:{
      isEmail:true,
    }
  },
  password:{
    type: DataTypes.STRING,
    allowNull:false
  },
  description:{
    type: DataTypes.TEXT
  },
  age:{
    type: DataTypes.INTEGER,
    allowNull:false
  },                 
  height:{
    type: DataTypes.INTEGER,
    allowNull: false
  },                    
  smoker:{
    type: DataTypes.BOOLEAN,
    get() {
      const rawValue = this.getDataValue('smoker');
      return rawValue === true ? 'Oui' : 'Non';
    }
  },
  marital:{
    type: DataTypes.STRING,
    allowNull: false
  },                 
  pet:{
    type: DataTypes.BOOLEAN,
    allowNull:false,
    get() {
      const rawValue = this.getDataValue('pet');
      return rawValue === true ? 'Oui' : 'Non';
    }
  },                          
  city:{
    type: DataTypes.STRING,
    allowNull:false
  },                         
  music:{
    type: DataTypes.STRING,
  },                     
  picture:{
    type: DataTypes.STRING,
  },
  zodiac:{
    type: DataTypes.STRING
  },               
  gender_match:{
    type: DataTypes.STRING,
    allowNull: false
  }  
}, {
  sequelize,
  tableName: 'user'
});