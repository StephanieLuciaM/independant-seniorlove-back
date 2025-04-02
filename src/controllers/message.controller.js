
import { Message } from "../models/message.model.js";
import { Op } from "sequelize";



export const messageController = {
  async createMessage (req, res) {
    const { sender_id, receiver_id, content } = req.body;
  
    // Vérification des champs requis
    if (!sender_id || !receiver_id || !content) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }
  
    try {
      // Création du message dans la base de données
      const newMessage = await Message.create({ sender_id, receiver_id, content });
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de l'envoi du message." });
    }
  },
  
  
  async getMessagesBetweenUsers (req, res) {
    const { userId1, userId2 } = req.query;
  
    if (!userId1 || !userId2) {
      return res.status(400).json({ error: "Les IDs des deux utilisateurs sont requis." });
    }
  
    try {
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
      res.status(500).json({ error: "Erreur lors de la récupération des messages." });
    }
  },

  // Dans votre messageController.js, ajoutez cette fonction :
  async getUserConversations(req, res) {
    const { userId } = req.query;
  
    if (!userId) {
      return res.status(400).json({ error: "L'ID utilisateur est requis." });
    }
  
    try {
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
      const conversations = Array.from(conversationPartners.values());
    
      // Trier par date de dernier message (du plus récent au plus ancien)
      conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
      res.status(200).json(conversations);
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des conversations." });
    }
  }
  
};
