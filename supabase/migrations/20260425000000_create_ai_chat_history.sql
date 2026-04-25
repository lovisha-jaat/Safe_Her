
-- Create ai_chat_history table
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat history"
    ON public.ai_chat_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat history"
    ON public.ai_chat_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history"
    ON public.ai_chat_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS ai_chat_history_user_id_idx ON public.ai_chat_history (user_id);
CREATE INDEX IF NOT EXISTS ai_chat_history_created_at_idx ON public.ai_chat_history (created_at);
