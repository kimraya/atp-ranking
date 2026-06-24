'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ------------------------------------------------------------------
// ACTION 1: START A NEW MATCH
// ------------------------------------------------------------------
export async function startMatchAction(
  matchType: 'singles' | 'doubles',
  team1: string[],
  team2: string[]
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('matches')
    .insert({
      match_type: matchType,
      status: 'in_progress',
      team_1_players: team1,
      team_2_players: team2,
    });

  if (error) {
    console.error("Failed to create match:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// ------------------------------------------------------------------
// ACTION 2: RESOLVE AN IN-PROGRESS MATCH
// ------------------------------------------------------------------
export async function resolveMatchAction(
  matchId: string | number,
  winningTeam: 1 | 2,
  team1: string[],
  team2: string[],
  matchType: 'singles' | 'doubles'
) {
  const supabase = await createClient();

  const dbWinningTeam = winningTeam === 1 ? 'team_1' : 'team_2';

  // 1. Mark match as completed
  await supabase
    .from('matches')
    .update({ status: 'completed', winning_team: dbWinningTeam })
    .eq('id', matchId);

  // 2. Determine who won and lost
  const winners = winningTeam === 1 ? team1 : team2;
  const losers = winningTeam === 1 ? team2 : team1;
  const pointsEarned = matchType === 'singles' ? 100 : 50;

  // 3. Update Winners (+1 Win, +Points)
  for (const player of winners) {
    const { data, error: fetchError } = await supabase
      .from('players')
      .select('wins, total_points')
      .eq('name', player)
      .single();

    if (fetchError) console.error(`Error fetching winner ${player}:`, fetchError.message);

    if (data) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          wins: (data.wins || 0) + 1,
          total_points: (data.total_points || 0) + pointsEarned
        })
        .eq('name', player);

      if (updateError) console.error(`Error updating winner ${player}:`, updateError.message);
    }
  }

  // 4. Update Losers (+1 Loss, -Points)
  for (const player of losers) {
    //  We must select 'total_points' here now so we can subtract from it!
    const { data, error: fetchError } = await supabase
      .from('players')
      .select('losses, total_points')
      .eq('name', player)
      .single();

    if (fetchError) console.error(`Error fetching loser ${player}:`, fetchError.message);

    if (data) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          losses: (data.losses || 0) + 1,
          //Deduct the exact same amount the winner earned
          total_points: (data.total_points || 0) - pointsEarned
        })
        .eq('name', player);

      if (updateError) console.error(`Error updating loser ${player}:`, updateError.message);
    }
  }

  // 5. Clear cache for the ENTIRE app layout
  revalidatePath('/', 'layout');

  return { success: true };
}

// ------------------------------------------------------------------
// ACTION 3: REGISTER A NEW PLAYER
// ------------------------------------------------------------------
export async function addPlayerAction(name: string, avatarUrl?: string) {
  const supabase = await createClient();
  const trimmedName = name.trim();

  // 1. Edge-case safety optimization
  if (!trimmedName) {
    return { success: false, error: "Player name cannot be blank." };
  }

  // 2. Insert with strict baseline rules
  const { error } = await supabase
    .from('players')
    .insert({
      name: trimmedName,
      avatar_url: avatarUrl?.trim() || null,
      total_points: 1500, // Syncs perfectly with your reset baseline!
      wins: 0,
      losses: 0,
    });

  if (error) {
    console.error("Failed to register player:", error.message);
    
    // Supabase standard error code for unique constraint violation
    if (error.code === '23505') {
      return { success: false, error: "A player with this name already exists." };
    }
    
    return { success: false, error: error.message };
  }

  // 3. Clear global cache instantly across public and admin tracks
  revalidatePath('/', 'layout');
  
  return { success: true };
}