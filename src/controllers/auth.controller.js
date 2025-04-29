import jwt from 'jsonwebtoken';
import passwordValidator from "password-validator";
import * as argon2 from "argon2";
import { Role, User, Label } from "../models/associations.js";
import slugify from 'slugify';

// Function to generate slug
const generateSlug = (name) => {
  return slugify(name, {
    lower: true, // Convert to lowercase
    remove: /[^a-zA-Z0-9 -]/g, // Remove special characters except spaces and hyphens
    strict: true // Remove any remaining special characters
  });
};

const jwtSecret = process.env.JWT_SECRET; // Retrieve the secret key from .env

export const authController = {

  // Handle user sign-up
  async signUp(req, res) {
    const { email, password, firstname, gender, age, height, marital, pet, city, gender_match, description, smoker, music, picture, zodiac, labels } = req.body;

    // Validate required fields
    if (!email || !password || !firstname || !gender || !age || !height || !marital || !pet || !city || !gender_match) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
    }

    // Configure password validator
    const passwordSchema = new passwordValidator();
    passwordSchema
      .is().min(8)
      .is().max(100)
      .has().uppercase()
      .has().lowercase()
      .has().digits(1)
      .has().not().spaces();

    // Validate password
    if (!passwordSchema.validate(password)) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre, et ne doit pas contenir d’espaces.',
      });
    }

    // Check if email is already in use
    const existingUser = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: "role"
      }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
    }

    // Hash the password
    const hashedPassword = await argon2.hash(password);
  
    const profilePhotoUrl = req.body.profile_photo_url; // URL de Cloudinary

    const finalPicture = (typeof picture === "string" && picture.trim() !== "") 
      ? picture 
      : (typeof profilePhotoUrl === "string" && profilePhotoUrl.trim() !== "") 
        ? profilePhotoUrl 
        : null;
    

    // Create the user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstname,
      gender,
      age,
      height,
      marital,
      pet,
      city,
      gender_match,
      description,
      smoker,
      music,
      picture: finalPicture,
      zodiac,
      slug: generateSlug(firstname) // Generate slug based on firstname
    });

    // Check if labels are provided and if the labels array is not empty
    if (labels && labels.length > 0) {
      // Find all labels in the database that match the provided label names
      const userLabels = await Label.findAll({
        where: {
          name: labels // Filter labels by the names provided in the request
        }
      });

      // Associate the found labels with the newly created user
      // This uses the `setLabels` method provided by Sequelize for many-to-many relationships
      await newUser.setLabels(userLabels);
    }

    // Save user to database
    await newUser.save();

    // Generate JWT
    const jwtContent = { userId: newUser.id };// Create JWT payload with user ID
    const jwtOptions = { algorithm: 'HS256', expiresIn: '3h' };// Define JWT options, setting the algorithm and expiration time
    const token = jwt.sign(jwtContent, jwtSecret, jwtOptions);// Sign the JWT using the secret key and options


    // Return the token and user info
    return res.status(201).json({ 
      message: 'Utilisateur créé avec succès.', 
      logged: true, 
      pseudo: newUser.firstname,
      token 
    });
  },


  // Handle user sign-in
  async signIn(req, res) {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont obligatoires.' });
    }

    // Find the user
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: "role"
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'Identifiants incorrects..' }); // 
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects..' });
    }

    //Cookie
    const options = {
      maxAge: 1000 * 60 * 60 * 3, // expire after 3 hours
      httpOnly: true, // Cookie will not be exposed to client side code
      //sameSite: "none", // If client and server origins are different
      //secure: true // use with HTTPS only
    };

    // Generate JWT
    const jwtContent = { userId: user.id }; // Create JWT payload with user ID
    const jwtOptions = { algorithm: 'HS256', expiresIn: '3h' }; // Define JWT options, setting the algorithm and expiration time
    const token = jwt.sign(jwtContent, jwtSecret, jwtOptions); // Sign the JWT using the secret key and options

    
    res.cookie('token', token, {
      httpOnly: true, 
      secure: true,      // Important for HTTPS
      sameSite: 'none',  // Critical for cross-domain requests
      maxAge: 24 * 60 * 60 * 1000 // Cookie lifespan
    });


    // Return the token and user info
    return res.status(200).json({ 
      message: 'Connexion réussie.', 
      logged: true, 
      pseudo: user.firstname,
      userId: user.id,
      token 
    });
  
  },

  async verifyToken(req, res){
    if (req.user) {
      res.status(200).json({ userId: req.user.userId, firstname: req.user.firstname });
    } else {
      res.status(401).json({ error: 'Token invalide.' });
    }
  },
  //Logs out the user by removing the authentification token
  async logout(req, res){
    res.clearCookie('token', { httpOnly: true});
    res.status(200).json({ message: 'Succès'}); 
  } 
};