-- ==========================================================================
-- Fix community table foreign keys so PostgREST can join profiles
-- community_submissions.user_id, community_reviews.reviewer_id, and
-- community_review_votes.voter_id must point to profiles(id) instead of
-- auth.users(id) for the `profiles:user_id(...)` select syntax to work.
-- ==========================================================================

-- Fix community_submissions.user_id -> profiles(id)
ALTER TABLE community_submissions
  DROP CONSTRAINT IF EXISTS community_submissions_user_id_fkey,
  ADD CONSTRAINT community_submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix community_reviews.reviewer_id -> profiles(id)
ALTER TABLE community_reviews
  DROP CONSTRAINT IF EXISTS community_reviews_reviewer_id_fkey,
  ADD CONSTRAINT community_reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix community_review_votes.voter_id -> profiles(id)
ALTER TABLE community_review_votes
  DROP CONSTRAINT IF EXISTS community_review_votes_voter_id_fkey,
  ADD CONSTRAINT community_review_votes_voter_id_fkey
    FOREIGN KEY (voter_id) REFERENCES profiles(id) ON DELETE CASCADE;
