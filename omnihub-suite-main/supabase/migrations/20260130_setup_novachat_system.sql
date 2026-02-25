-- ============================================================
-- NovaChat History System - ChatGPT-style Architecture
-- ============================================================

-- 1. CREATE CONVERSATIONS TABLE
create table if not exists ai_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  is_archived boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. CREATE MESSAGES TABLE
create table if not exists ai_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- 3. CREATE INDEXES
create index if not exists idx_ai_conversations_user_id on ai_conversations(user_id);
create index if not exists idx_ai_conversations_updated_at on ai_conversations(updated_at desc);
create index if not exists idx_ai_conversations_is_archived on ai_conversations(is_archived);
create index if not exists idx_ai_messages_conversation_id on ai_messages(conversation_id);
create index if not exists idx_ai_messages_created_at on ai_messages(created_at);

-- 4. ROW LEVEL SECURITY
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

-- 5. RLS POLICIES - CONVERSATIONS
-- Users can only read their own conversations
create policy "Users can read own conversations"
  on ai_conversations for select
  using (auth.uid() = user_id);

-- Users can only insert conversations for themselves
create policy "Users can create own conversations"
  on ai_conversations for insert
  with check (auth.uid() = user_id);

-- Users can only update their own conversations
create policy "Users can update own conversations"
  on ai_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete their own conversations
create policy "Users can delete own conversations"
  on ai_conversations for delete
  using (auth.uid() = user_id);

-- 6. RLS POLICIES - MESSAGES
-- Users can read messages from their own conversations
create policy "Users can read messages from own conversations"
  on ai_messages for select
  using (
    conversation_id in (
      select id from ai_conversations where user_id = auth.uid()
    )
  );

-- Users can insert messages into their own conversations
create policy "Users can insert messages in own conversations"
  on ai_messages for insert
  with check (
    conversation_id in (
      select id from ai_conversations where user_id = auth.uid()
    )
  );

-- 7. TRIGGERS - AUTO UPDATE UPDATED_AT
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ai_conversations_updated_at
  before update on ai_conversations
  for each row
  execute function update_conversation_timestamp();

-- 8. TRIGGER - UPDATE CONVERSATION TIMESTAMP WHEN MESSAGE ADDED
create or replace function update_conversation_on_message()
returns trigger as $$
begin
  update ai_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger ai_messages_update_conversation
  after insert on ai_messages
  for each row
  execute function update_conversation_on_message();

-- ============================================================
-- GRANTS
-- ============================================================
grant all on ai_conversations to authenticated;
grant all on ai_messages to authenticated;
grant usage on schema public to authenticated;
