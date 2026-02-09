import supabase from '../config/supabase.js';
import { emitMessage, emitNotification } from '../utils/socket.js';

/**
 * Chat Controller
 * Handles conversation management and persistent messaging
 */

/**
 * Search users to start a new chat
 * GET /api/chat/users/search?q=query
 */
export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const currentUserId = req.user.id;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Query must be at least 2 characters'
            });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, avatar, email')
            .neq('id', currentUserId)
            .ilike('name', `%${q}%`)
            .limit(20);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Search Users Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};

/**
 * Get all conversations for the current user
 * GET /api/chat/conversations
 */
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch conversations where user is a participant
        const { data: participants, error: pError } = await supabase
            .from('conversation_participants')
            .select(`
                conversation_id,
                conversations (
                    id,
                    last_message_at,
                    updated_at,
                    messages (
                        content,
                        created_at,
                        sender_id
                    )
                )
            `)
            .eq('user_id', userId)
            .order('conversations(last_message_at)', { ascending: false });

        if (pError) throw pError;

        // For each conversation, get the other participant's details
        const conversations = await Promise.all(participants.map(async (p) => {
            const conv = p.conversations;

            // Get other participant
            const { data: otherParticipant, error: opError } = await supabase
                .from('conversation_participants')
                .select(`
                    user_id,
                    users (
                        id,
                        name,
                        avatar
                    )
                `)
                .eq('conversation_id', conv.id)
                .neq('user_id', userId)
                .single();

            // Get unread count
            const { count: unreadCount, error: ucError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', userId);

            // Get last message separately for cleaner data
            const { data: lastMessages } = await supabase
                .from('messages')
                .select('content, created_at, sender_id')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1);

            const lastMessage = lastMessages && lastMessages[0] ? lastMessages[0] : null;

            return {
                id: conv.id,
                last_message_at: conv.last_message_at,
                other_user: otherParticipant?.users || { name: 'Unknown User' },
                last_message: lastMessage,
                unread_count: unreadCount || 0
            };
        }));

        return res.status(200).json({
            success: true,
            data: conversations
        });
    } catch (error) {
        console.error('Get Conversations Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations'
        });
    }
};

/**
 * Get message history for a conversation
 * GET /api/chat/conversations/:id/messages
 */
export const getMessages = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user.id;

        // Verify participation
        const { data: participant, error: pError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (pError || !participant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation'
            });
        }

        // Fetch messages
        const { data: messages, error: mError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (mError) throw mError;

        // Mark as read
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId);

        return res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Get Messages Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
};

/**
 * Create or get conversation between current user and another user
 * POST /api/chat/conversations
 * Body: { participantId }
 */
export const startConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        const currentUserId = req.user.id;

        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: 'Participant ID is required'
            });
        }

        // 1. Check if conversation already exists
        const { data: existingParticipant, error: eError } = await supabase.rpc('get_shared_conversation', {
            user_a: currentUserId,
            user_b: participantId
        });

        if (existingParticipant && existingParticipant.length > 0) {
            return res.status(200).json({
                success: true,
                data: { id: existingParticipant[0].conversation_id }
            });
        }

        // 2. Create new conversation
        const { data: conversation, error: cError } = await supabase
            .from('conversations')
            .insert({})
            .select()
            .single();

        if (cError) throw cError;

        // 3. Add participants
        const { error: pError } = await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: conversation.id, user_id: currentUserId },
                { conversation_id: conversation.id, user_id: participantId }
            ]);

        if (pError) throw pError;

        return res.status(201).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Start Conversation Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to start conversation'
        });
    }
};

/**
 * Send a message
 * POST /api/chat/conversations/:id/messages
 * Body: { content, type }
 */
export const sendMessage = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const { content, type = 'text', metadata = null } = req.body;
        const senderId = req.user.id;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Verify participation
        const { data: participant, error: pError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', senderId)
            .single();

        if (pError || !participant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages in this chat'
            });
        }

        // Save message
        const { data: message, error: mError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
                type,
                metadata
            })
            .select()
            .single();

        if (mError) throw mError;

        // Emit via Socket.io
        emitMessage(conversationId, message);

        // Notify other participant (simplified for now)
        const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', senderId)
            .single();

        if (otherParticipant) {
            emitNotification(otherParticipant.user_id, {
                type: 'new_message',
                sender_id: senderId,
                conversation_id: conversationId,
                content: content.substring(0, 50)
            });
        }

        return res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error('Send Message Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};
