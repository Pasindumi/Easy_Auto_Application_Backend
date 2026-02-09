-- Chat Infrastructure Migrations (Ultra-Robust Version)

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Safely cleanup existing triggers and functions
DO $$ 
BEGIN
    -- Drop triggers ONLY if tables exist to avoid "relation does not exist" errors
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP TRIGGER IF EXISTS trigger_update_last_message_at ON public.messages;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        DROP TRIGGER IF EXISTS trigger_update_conversations_timestamp ON public.conversations;
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.update_last_message_at();
DROP FUNCTION IF EXISTS public.update_conversations_timestamp();
DROP FUNCTION IF EXISTS public.get_shared_conversation(UUID, UUID);

-- 3. Drop tables in correct order (dependency order)
DROP TABLE IF EXISTS public.conversation_participants;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;

-- 4. Create Conversations Table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Conversation Participants Table
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 6. Create Messages Table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 8. Helper Function: get_shared_conversation
CREATE OR REPLACE FUNCTION public.get_shared_conversation(user_a UUID, user_b UUID)
RETURNS TABLE (conversation_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT p1.conversation_id
    FROM public.conversation_participants p1
    JOIN public.conversation_participants p2 ON p1.conversation_id = p2.conversation_id
    WHERE p1.user_id = user_a AND p2.user_id = user_b;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger: update_last_message_at
CREATE OR REPLACE FUNCTION public.update_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_last_message_at();

-- 10. Trigger: update_conversations_timestamp
CREATE OR REPLACE FUNCTION public.update_conversations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversations_timestamp
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_conversations_timestamp();
