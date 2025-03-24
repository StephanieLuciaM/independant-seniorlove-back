
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
  }
  
};
