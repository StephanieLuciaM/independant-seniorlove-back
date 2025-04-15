

import { Event, Label, User } from "../models/associations.js";
import { Op } from 'sequelize';
import slugify from 'slugify';

// Function to generate slug

const generateSlug = (name) => {
  return slugify(name, {
    lower: true, // Convert to lowercase
    remove: /[^a-zA-Z0-9 -]/g, // Remove special characters except spaces and hyphens
    strict: true // Remove any remaining special characters
  });

};   

export const eventController = {
  async getAllEvents(req,res){
    try {
      // Fetch all events including associated labels and users
      const events = await Event.findAll({
        include: [
          'label','users' ],
      });
  
      // Return the fetched events as a JSON response
      res.json(events);
    } catch (error) {
      // Handle any errors that occur during the fetch
      res.status(500).json({ message: 'Quelque chose s\'est mal passé', error });
    }
  },

  async getEventDetails(req, res) {
    const { eventIdorSlug } = req.params;
    try {
      const eventId = parseInt(eventIdorSlug, 10);
      const event = await Event.findOne({
        where: {
          [Op.or]: [
            // Si c'est un nombre valide, recherchez par ID
            ...(Number.isInteger(eventId) ? [{ id: eventId }] : []),
            // Sinon, recherchez par slug
            { slug: eventIdorSlug }
          ]
        },
        include: [
          'label', 'users'],
      });
      
      if (!event) {
        return res.status(404).json({ message: 'Evènement non trouvé' });
      }
      
      // Ajout de cette ligne pour renvoyer l'événement trouvé
      return res.status(200).json(event);
          
    } catch (error) {
      // Handle any errors that occur during the fetch
      res.status(500).json({ message: 'Quelque chose s\'est mal passé', error });
    }
  },
  
  async lastEvent(req,res){
    try {
      const cities = ['PARIS', 'LYON', 'MARSEILLE', 'TOULOUSE'];
      const events = await Promise.all(cities.map(async (city) => {
        return await Event.findOne({
          where: { city },


          order: [['created_at', 'DESC']],
          include: {model:Label, as:'label'}

        });
      }));
      res.json(events);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ err: 'Erreur lors de la récupération des événements' });
    }
  },

  async connectedEvent(req, res) {
    const userId = req.user.userId;

    // Get user data
    const user = await User.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find relevant events
    const events = await Event.findAll({
      where: {
        city: user.city, // Events in user's city
        date: {
          [Op.gte]: new Date() // Only future events
        }
      },
      limit: 4,
      order: [['date', 'ASC']], // Soonest events first
      include: [{
        model: Label,
        as: 'label' // Include event category information
      }]
    });

    res.status(200).json(events);
  },

  async registerUserToEvent(req, res) {
    try {
      const { userId, eventId } = req.body;
        
      // Vérifier que les données nécessaires sont présentes
      if (!userId || !eventId) { 
        return res.status(400).json({error: "Tous les champs sont requis"});
      }
      
      // Vérifier si l'utilisateur existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({error: "Utilisateur non trouvé"});
      }
      
      // Vérifier si l'événement existe
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ error:"Événement non trouvé"});
      }
      
      // Vérifier si l'utilisateur est déjà inscrit à cet événement
      const userEvents = await user.getEvents({ where: { id: eventId } });
      if (userEvents.length > 0) {
        return res.status(409).json({ console:"Vous êtes déjà inscrit à cet événement"});
      }
      
      // Inscrire l'utilisateur à l'événement
      await user.addEvent(event, { 
        through: { 
          created_at: new Date() 
        } 
      });
      
      // Réponse avec succès
      return res.status(201).json({message: "Inscription réussie à l'événement"});
      
    } catch (error) {
      console.error("Erreur lors de l'inscription à l'événement:", error);
      return res.status(500).json({error: "Une erreur est survenue lors de l'inscription"});
    }
  }
};