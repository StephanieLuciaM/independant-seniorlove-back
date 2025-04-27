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
      res.status(500).json({ message: 'Something went wrong', error });
    }
  },

  async getEventDetails(req, res) {
    const { eventIdorSlug } = req.params;
    try {
      const eventId = parseInt(eventIdorSlug, 10);
      const event = await Event.findOne({
        where: {
          [Op.or]: [
            // If it's a valid number, search by ID
            ...(Number.isInteger(eventId) ? [{ id: eventId }] : []),
            // Otherwise, search by slug
            { slug: eventIdorSlug }
          ]
        },
        include: [
          'label', 'users'],
      });
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // Added this line to return the found event
      return res.status(200).json(event);
          
    } catch (error) {
      // Handle any errors that occur during the fetch
      res.status(500).json({ message: 'Something went wrong', error });
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
      return res.status(500).json({ err: 'Error retrieving events' });
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
        
      // Check that the necessary data is present
      if (!userId || !eventId) { 
        return res.status(400).json({error: "All fields are required"});
      }
      
      // Check if the user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({error: "User not found"});
      }
      
      // Check if the event exists
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found"});
      }
      
      // Check if the user is already registered for this event
      const userEvents = await user.getEvents({ where: { id: eventId } });
      if (userEvents.length > 0) {
        return res.status(409).json({ console: "You are already registered for this event"});
      }
      
      // Register the user for the event
      await user.addEvent(event, { 
        through: { 
          created_at: new Date() 
        } 
      });
      
      // Success response
      return res.status(201).json({message: "Successfully registered for the event"});
      
    } catch (error) {
      console.error("Error during event registration:", error);
      return res.status(500).json({error: "An error occurred during registration"});
    }
  },

};