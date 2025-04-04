
import { Message } from "../models/message.model.js";
import { Op } from "sequelize";
import slugify from 'slugify';
import { User } from "../models/user.model.js";

// Function to generate slug

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
    
    // Vérification des champs requis
    if (!sender_id || !receiver_id || !content) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    
    try {
      // Création du message dans la base de données
      const newMessage = await Message.create({ sender_id, receiver_id, content });
      
      // Récupération des informations complètes des utilisateurs
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
      
      // Construction d'une réponse enrichie
      const messageWithDetails = {
        ...newMessage.toJSON(),
        sender: sender ? sender.toJSON() : null,
        receiver: receiver ? receiver.toJSON() : null
      };
      
      res.status(201).json(messageWithDetails);
    } catch (error) {
      console.error('Erreur détaillée:', error);
      res.status(500).json({ 
        error: "Erreur lors de l'envoi du message.",
        message: error.message 
      });
    }
  },
  
  
  async getMessagesBetweenUsers(req, res) {
    const { user1, user2 } = req.query;
    
    if (!user1 || !user2) {
      return res.status(400).json({ error: "Les identifiants des deux utilisateurs sont requis." });
    }
  
    try {
      // Trouver les IDs réels des utilisateurs (qu'ils soient fournis comme ID ou slug)
      const findUserId = async (userIdOrSlug) => {
        // Essai de conversion en nombre
        const userId = parseInt(userIdOrSlug, 10);
        
        const user = await User.findOne({
          where: {
            [Op.or]: [
              // Si c'est un nombre valide, recherchez par ID
              ...(Number.isInteger(userId) ? [{ id: userId }] : []),
              // Sinon, recherchez par slug
              { slug: userIdOrSlug }
            ]
          },
          attributes: ['id'] // On ne récupère que l'ID pour optimisation
        });
        
        if (!user) {
          throw new Error(`Utilisateur non trouvé: ${userIdOrSlug}`);
        }
        
        return user.id;
      };
      
      // Récupérer les IDs réels des deux utilisateurs
      const userId1 = await findUserId(user1);
      const userId2 = await findUserId(user2);
      
      // Récupérer les messages entre ces deux utilisateurs
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { sender_id: userId1, receiver_id: userId2 },
            { sender_id: userId2, receiver_id: userId1 }
          ]
        },
        order: [["created_at", "ASC"]], // Tri par date croissante
      });
      
      res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur détaillée:', error);
      res.status(500).json({ 
        error: "Erreur lors de la récupération des messages.",
        message: error.message 
      });
    }
  },

  // Dans votre messageController.js, ajoutez cette fonction :
  async getUserConversations(req, res) {
    const { user } = req.query;
  
    if (!user) {
      return res.status(400).json({ error: "L'ID utilisateur est requis." });
    }
  
    try {
      // Trouver les IDs réels des utilisateurs (qu'ils soient fournis comme ID ou slug)
      const findUserId = async (userIdOrSlug) => {
        // Essai de conversion en nombre
        const userId = parseInt(userIdOrSlug, 10);
        
        const user = await User.findOne({
          where: {
            [Op.or]: [
              // Si c'est un nombre valide, recherchez par ID
              ...(Number.isInteger(userId) ? [{ id: userId }] : []),
              // Sinon, recherchez par slug
              { slug: userIdOrSlug }
            ]
          },
          attributes: ['id'] // On ne récupère que l'ID pour optimisation
        });
        
        if (!user) {
          throw new Error(`Utilisateur non trouvé: ${userIdOrSlug}`);
        }
        
        return user.id;
      };
  
      const userId = await findUserId(user);
      
      // Récupérer tous les messages où l'utilisateur est expéditeur ou destinataire
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        },
        order: [["created_at", "DESC"]], // Du plus récent au plus ancien
      });
    
      // Extraire les IDs uniques des autres utilisateurs avec qui l'utilisateur a échangé
      const conversationPartners = new Map();
    
      messages.forEach(message => {
        const partnerId = message.sender_id == userId ? message.receiver_id : message.sender_id;
      
        // Si ce partenaire n'est pas déjà dans notre map ou si ce message est plus récent
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
    
      // Convertir la Map en tableau
      let conversations = Array.from(conversationPartners.values());
    
      // Récupérer les détails des utilisateurs pour chaque conversation
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
      
      // Créer un map pour un accès facile par ID
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, user.toJSON());
      });
      
      // Enrichir chaque conversation avec les détails de l'utilisateur
      conversations = conversations.map(conv => ({
        ...conv,
        partner: userMap.get(conv.user_id) || null
      }));
    
      // Trier par date de dernier message (du plus récent au plus ancien)
      conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
      res.status(200).json(conversations);
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
      res.status(500).json({ 
        error: "Erreur lors de la récupération des conversations.",
        message: error.message
      });
    }
  }
  
};
