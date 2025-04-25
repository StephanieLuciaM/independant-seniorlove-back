import { Message } from "../models/message.model.js";
import { Op } from "sequelize";
import slugify from 'slugify';
import { User } from "../models/user.model.js";

// Function to generate a slug
const generateSlug = (name) => {
  return slugify(name, {
    lower: true, // Convert to lowercase
    remove: /[^a-zA-Z0-9 -]/g, // Remove special characters except spaces and hyphens
    strict: true // Remove any remaining special characters
  });
};

export const messageController = {
  async createMessage(req, res) {
    const { sender_id, receiver_id, content } = req.body;

    // Check for required fields
    if (!sender_id || !receiver_id || !content) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      // Create the message in the database
      const newMessage = await Message.create({ sender_id, receiver_id, content });

      // Retrieve complete user information
      const sender = await User.findByPk(sender_id, {
        attributes: [
          'id', 'firstname', 'slug'
        ]
      });

      const receiver = await User.findByPk(receiver_id, {
        attributes: [
          'id', 'firstname', 'slug'
        ]
      });

      // Construct a detailed response
      const messageWithDetails = {
        ...newMessage.toJSON(),
        sender: sender ? sender.toJSON() : null,
        receiver: receiver ? receiver.toJSON() : null
      };

      res.status(201).json(messageWithDetails);
    } catch (error) {
      console.error('Detailed error:', error);
      res.status(500).json({
        error: "Error while sending the message.",
        message: error.message
      });
    }
  },

  async getMessagesBetweenUsers(req, res) {
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ error: "Both user identifiers are required." });
    }

    try {
      // Find the actual user IDs (whether provided as ID or slug)
      const findUserId = async (userIdOrSlug) => {
        // Try converting to a number
        const userId = parseInt(userIdOrSlug, 10);

        const user = await User.findOne({
          where: {
            [Op.or]: [
              // If it’s a valid number, search by ID
              ...(Number.isInteger(userId) ? [{ id: userId }] : []),
              // Otherwise, search by slug
              { slug: userIdOrSlug }
            ]
          },
          attributes: ['id'] // Only retrieve the ID for optimization
        });

        if (!user) {
          throw new Error(`User not found: ${userIdOrSlug}`);
        }

        return user.id;
      };

      // Retrieve the actual IDs of both users
      const userId1 = await findUserId(user1);
      const userId2 = await findUserId(user2);

      // Retrieve messages between these two users
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { sender_id: userId1, receiver_id: userId2 },
            { sender_id: userId2, receiver_id: userId1 }
          ]
        },
        order: [["created_at", "ASC"]], // Sort by ascending date
      });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Detailed error:', error);
      res.status(500).json({
        error: "Error while retrieving the messages.",
        message: error.message
      });
    }
  },

  async getUserConversations(req, res) {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "User ID is required." });
    }

    try {
      // Find the actual user ID (whether provided as ID or slug)
      const findUserId = async (userIdOrSlug) => {
        // Try converting to a number
        const userId = parseInt(userIdOrSlug, 10);

        const user = await User.findOne({
          where: {
            [Op.or]: [
              // If it’s a valid number, search by ID
              ...(Number.isInteger(userId) ? [{ id: userId }] : []),
              // Otherwise, search by slug
              { slug: userIdOrSlug }
            ]
          },
          attributes: ['id'] // Only retrieve the ID for optimization
        });

        if (!user) {
          throw new Error(`User not found: ${userIdOrSlug}`);
        }

        return user.id;
      };

      const userId = await findUserId(user);

      // Retrieve all messages where the user is either sender or receiver
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        },
        order: [["created_at", "DESC"]], // From most recent to oldest
      });

      // Extract unique IDs of other users the user has interacted with
      const conversationPartners = new Map();

      messages.forEach(message => {
        const partnerId = message.sender_id == userId ? message.receiver_id : message.sender_id;

        // If this partner isn’t already in our map or if this message is more recent
        if (!conversationPartners.has(partnerId) ||
          conversationPartners.get(partnerId).created_at < message.created_at) {
          conversationPartners.set(partnerId, {
            user_id: partnerId,
            last_message: message.content,
            last_message_id: message.id,
            created_at: message.created_at,
            updated_at: message.updated_at,
            is_sender: message.sender_id == userId
          });
        }
      });

      // Convert the Map to an array
      let conversations = Array.from(conversationPartners.values());

      // Retrieve user details for each conversation
      const userIds = [...conversationPartners.keys()];
      const users = await User.findAll({
        where: {
          id: userIds
        },
        attributes: [
          'id', 'firstname', 'slug', 'picture', 'age', 'city',
          'gender', 'description', 'zodiac'
        ]
      });

      // Create a map for easy access by ID
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, user.toJSON());
      });

      // Enrich each conversation with user details
      conversations = conversations.map(conv => ({
        ...conv,
        partner: userMap.get(conv.user_id) || null
      }));

      // Sort by date of last message (most recent to oldest)
      conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.status(200).json(conversations);
    } catch (error) {
      console.error("Error while retrieving conversations:", error);
      res.status(500).json({
        error: "Error while retrieving conversations.",
        message: error.message
      });
    }
  }
};
