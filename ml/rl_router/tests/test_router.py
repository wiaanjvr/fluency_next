"""
Unit tests for the RL Module Router.

Tests the core algorithms, state assembly, reward computation, and
cold-start logic without requiring a live database connection.
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.rl_router.config import settings
from ml.rl_router.engine.bandit import ACTIONS, LinUCBModel
from ml.rl_router.engine.cold_start import cold_start_recommend
from ml.rl_router.engine.reward import compute_reward
from ml.rl_router.engine.state_assembler import STATE_DIM, UserState


# ── State Assembler Tests ───────────────────────────────────────────────────


class TestUserState:
    def test_default_state_vector_shape(self):
        state = UserState(user_id="test-user")
        vec = state.to_vector()
        assert vec.shape == (STATE_DIM,)
        assert vec.dtype == np.float32

    def test_state_vector_values_in_range(self):
        state = UserState(
            user_id="test-user",
            avg_production_score=0.7,
            avg_pronunciation_score=0.4,
            weakest_concept_score=0.2,
            cognitive_load_last_session=0.6,
            estimated_available_minutes=20.0,
            days_since_last_session=5.0,
            due_word_count=50,
            total_words=300,
            low_production_words=["w1", "w2", "w3"],
            low_pronunciation_words=["w4"],
            dkt_mastery=[0.3, 0.5, 0.7, 0.9],
            last_modules=["story_engine", "anki_drill"],
            session_completion_rate=0.8,
        )
        vec = state.to_vector()
        # All features except sin/cos should be in [0, 1] or [-1, 1]
        assert all(-1.1 <= v <= 1.1 for v in vec), f"Out of range: {vec}"

    def test_state_snapshot_roundtrip(self):
        state = UserState(
            user_id="test-user",
            event_count=100,
            avg_production_score=0.45,
            weakest_concept_tag="subjunctive",
        )
        snapshot = state.to_snapshot()
        assert snapshot["event_count"] == 100
        assert snapshot["avg_production_score"] == 0.45
        assert snapshot["weakest_concept_tag"] == "subjunctive"

    def test_empty_dkt_mastery(self):
        state = UserState(user_id="test-user", dkt_mastery=[])
        vec = state.to_vector()
        # Should use default [0.5] when empty
        assert vec[0] == 0.5  # mean

    def test_last_modules_encoding(self):
        state = UserState(
            user_id="test-user",
            last_modules=["story_engine", "grammar_lesson", "rest"],
        )
        vec = state.to_vector()
        # Modules should be encoded as index / (num_modules - 1)
        assert 0.0 <= vec[6] <= 1.0
        assert 0.0 <= vec[7] <= 1.0
        assert 0.0 <= vec[8] <= 1.0


# ── LinUCB Bandit Tests ─────────────────────────────────────────────────────


class TestLinUCBModel:
    def test_initialization(self):
        model = LinUCBModel(n_actions=7, d=24, alpha=1.5)
        assert len(model.A) == 7
        assert model.d == 24
        assert model.total_updates == 0

    def test_predict_returns_valid_action(self):
        model = LinUCBModel(n_actions=7, d=24)
        x = np.random.randn(24).astype(np.float32)
        action, scores = model.predict(x)
        assert 0 <= action < 7
        assert scores.shape == (7,)

    def test_predict_with_probs(self):
        model = LinUCBModel(n_actions=7, d=24)
        x = np.random.randn(24).astype(np.float32)
        action, probs = model.predict_with_probs(x)
        assert 0 <= action < 7
        assert abs(probs.sum() - 1.0) < 1e-5
        assert all(p >= 0 for p in probs)

    def test_update_changes_model(self):
        model = LinUCBModel(n_actions=7, d=24)
        x = np.random.randn(24).astype(np.float32)
        _, scores_before = model.predict(x)
        model.update(0, x, 2.0)
        _, scores_after = model.predict(x)
        # At least one score should change
        assert not np.allclose(scores_before, scores_after)
        assert model.total_updates == 1
        assert model.arm_pulls[0] == 1

    def test_batch_update(self):
        model = LinUCBModel(n_actions=7, d=24)
        n = 10
        actions = [i % 7 for i in range(n)]
        contexts = np.random.randn(n, 24).astype(np.float32)
        rewards = [1.0] * n
        model.batch_update(actions, contexts, rewards)
        assert model.total_updates == n

    def test_confidence_in_range(self):
        model = LinUCBModel(n_actions=7, d=24)
        x = np.random.randn(24).astype(np.float32)
        conf = model.get_confidence(0, x)
        assert 0.0 <= conf <= 1.0

    def test_save_load_roundtrip(self, tmp_path):
        model = LinUCBModel(n_actions=7, d=24)
        x = np.random.randn(24).astype(np.float32)
        model.update(0, x, 2.0)
        model.update(3, x, -1.0)

        path = tmp_path / "test_model.joblib"
        model.save(path)

        model2 = LinUCBModel(n_actions=7, d=24)
        assert model2.load(path)
        assert model2.total_updates == 2
        assert model2.arm_pulls[0] == 1
        assert model2.arm_pulls[3] == 1


# ── Cold Start Tests ────────────────────────────────────────────────────────


class TestColdStart:
    def test_default_recommendation(self):
        state = UserState(user_id="test-user", event_count=10)
        result = cold_start_recommend(state)
        assert result["module"] == "story_engine"
        assert result["confidence"] >= 0.0

    def test_low_production_triggers_conjugation(self):
        state = UserState(
            user_id="test-user",
            avg_production_score=0.3,
            low_production_words=["w1", "w2"],
        )
        result = cold_start_recommend(state)
        assert result["module"] == "conjugation_drill"
        assert "w1" in result["target_words"]

    def test_low_pronunciation_triggers_pronunciation(self):
        state = UserState(
            user_id="test-user",
            avg_production_score=0.6,  # above threshold
            avg_pronunciation_score=0.2,
            low_pronunciation_words=["w1"],
        )
        result = cold_start_recommend(state)
        assert result["module"] == "pronunciation_session"

    def test_low_grammar_triggers_grammar_lesson(self):
        state = UserState(
            user_id="test-user",
            avg_production_score=0.6,
            avg_pronunciation_score=0.6,
            weakest_concept_tag="subjunctive",
            weakest_concept_score=0.2,
        )
        result = cold_start_recommend(state)
        assert result["module"] == "grammar_lesson"
        assert result["target_concept"] == "subjunctive"

    def test_high_cognitive_load_triggers_rest(self):
        state = UserState(
            user_id="test-user",
            avg_production_score=0.6,
            avg_pronunciation_score=0.6,
            cognitive_load_last_session=0.9,
        )
        result = cold_start_recommend(state)
        assert result["module"] == "rest"

    def test_priority_order(self):
        """Production has higher priority than pronunciation."""
        state = UserState(
            user_id="test-user",
            avg_production_score=0.3,
            avg_pronunciation_score=0.2,
            low_production_words=["w1"],
            low_pronunciation_words=["w2"],
        )
        result = cold_start_recommend(state)
        assert result["module"] == "conjugation_drill"


# ── Reward Computation Tests ────────────────────────────────────────────────


class TestRewardComputation:
    def test_full_positive_reward(self):
        """Perfect session: all improvements, completed, no monotony."""
        decision = {"recommended_module": "story_engine", "target_word_ids": []}
        pre = {"avg_recall": 0.5, "avg_production_score": 0.4, "avg_pronunciation_score": 0.3}
        post = {"avg_recall": 0.7, "avg_production_score": 0.6, "avg_pronunciation_score": 0.5, "cognitive_load_last_session": 0.4}
        total, components = compute_reward(
            decision, pre, post, session_completed=True, last_n_modules=["story_engine"]
        )
        assert total > 0
        assert components["recall_improvement"] == 2.0
        assert components["production_improvement"] == 1.5
        assert components["session_completed"] == 1.0
        assert components["pronunciation_improvement"] == 0.5
        assert total == 5.0

    def test_abandoned_session_penalty(self):
        """Session abandoned with high cognitive load."""
        decision = {"recommended_module": "grammar_lesson", "target_word_ids": []}
        pre = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5}
        post = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5, "cognitive_load_last_session": 0.8}
        total, components = compute_reward(
            decision, pre, post, session_completed=False, last_n_modules=["grammar_lesson"]
        )
        assert components["session_abandoned"] == -1.0
        assert components["session_completed"] == 0.0

    def test_monotony_penalty(self):
        """Same module 3 times in a row."""
        decision = {"recommended_module": "anki_drill", "target_word_ids": []}
        pre = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5}
        post = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5, "cognitive_load_last_session": 0.4}
        total, components = compute_reward(
            decision, pre, post,
            session_completed=True,
            last_n_modules=["anki_drill", "anki_drill", "anki_drill"],
        )
        assert components["monotony_penalty"] == -0.5

    def test_no_monotony_with_variety(self):
        """Different modules — no penalty."""
        decision = {"recommended_module": "cloze_practice", "target_word_ids": []}
        pre = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5}
        post = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5, "cognitive_load_last_session": 0.4}
        total, components = compute_reward(
            decision, pre, post,
            session_completed=True,
            last_n_modules=["story_engine", "anki_drill", "cloze_practice"],
        )
        assert components["monotony_penalty"] == 0.0

    def test_no_improvement_minimal_reward(self):
        """Session completed but no improvements."""
        decision = {"recommended_module": "story_engine", "target_word_ids": []}
        pre = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5}
        post = {"avg_recall": 0.5, "avg_production_score": 0.5, "avg_pronunciation_score": 0.5, "cognitive_load_last_session": 0.4}
        total, components = compute_reward(
            decision, pre, post, session_completed=True, last_n_modules=["story_engine"]
        )
        assert total == 1.0  # only session_completed
        assert components["session_completed"] == 1.0


# ── PPO Agent Tests (only if torch is available) ────────────────────────────


class TestPPOAgent:
    @pytest.fixture(autouse=True)
    def skip_if_no_torch(self):
        try:
            import torch
        except ImportError:
            pytest.skip("PyTorch not installed")

    def test_network_forward(self):
        import torch
        from ml.rl_router.engine.ppo_agent import ActorCritic

        net = ActorCritic(state_dim=24, n_actions=7)
        x = torch.randn(4, 24)
        logits, values = net(x)
        assert logits.shape == (4, 7)
        assert values.shape == (4,)

    def test_get_action(self):
        import torch
        from ml.rl_router.engine.ppo_agent import ActorCritic

        net = ActorCritic(state_dim=24, n_actions=7)
        x = torch.randn(24)
        action, log_prob, value = net.get_action(x)
        assert 0 <= action < 7
        assert isinstance(log_prob, float)
        assert isinstance(value, float)

    def test_rollout_buffer(self):
        from ml.rl_router.engine.ppo_agent import RolloutBuffer

        buf = RolloutBuffer(capacity=100)
        for i in range(20):
            buf.add(
                state=np.random.randn(24).astype(np.float32),
                action=i % 7,
                reward=1.0,
                log_prob=-0.5,
                value=0.5,
                done=True,
            )
        assert len(buf) == 20

        adv, ret = buf.compute_gae()
        assert adv.shape == (20,)
        assert ret.shape == (20,)

    def test_ppo_agent_predict(self):
        from ml.rl_router.engine.ppo_agent import PPOAgent

        agent = PPOAgent(state_dim=24, n_actions=7)
        x = np.random.randn(24).astype(np.float32)
        action, probs = agent.predict(x)
        assert 0 <= action < 7
        assert abs(probs.sum() - 1.0) < 1e-5

    def test_ppo_save_load(self, tmp_path):
        from ml.rl_router.engine.ppo_agent import PPOAgent

        agent = PPOAgent(state_dim=24, n_actions=7)
        path = tmp_path / "test_ppo.pt"
        agent._is_loaded = True
        agent.save(path)

        agent2 = PPOAgent(state_dim=24, n_actions=7)
        assert agent2.load(path)
        assert agent2.is_loaded


# ── Integration-like test (no DB) ──────────────────────────────────────────


class TestEndToEnd:
    def test_cold_start_to_vector_pipeline(self):
        """Full pipeline: create state → vector → cold start → result."""
        state = UserState(
            user_id="test-user-123",
            event_count=10,
            dkt_mastery=[0.4, 0.5, 0.6],
            last_modules=["story_engine"],
            avg_production_score=0.35,
            avg_pronunciation_score=0.5,
            weakest_concept_tag="conditional",
            weakest_concept_score=0.25,
            cognitive_load_last_session=0.6,
            days_since_last_session=2.0,
            estimated_available_minutes=15.0,
            low_production_words=["w1", "w2", "w3"],
            due_word_count=20,
            total_words=100,
        )

        # Can convert to vector
        vec = state.to_vector()
        assert vec.shape == (STATE_DIM,)

        # Cold start gives recommendation
        result = cold_start_recommend(state)
        assert result["module"] in [a for a in ACTIONS]
        assert isinstance(result["confidence"], float)
        assert isinstance(result["reason"], str)

    def test_bandit_with_state_vector(self):
        """LinUCB works with a state vector from UserState."""
        model = LinUCBModel(n_actions=7, d=24)
        state = UserState(
            user_id="test-user",
            dkt_mastery=[0.5, 0.6, 0.7],
            avg_production_score=0.5,
        )
        vec = state.to_vector()
        action, probs = model.predict_with_probs(vec)
        assert 0 <= action < 7
        assert probs.shape == (7,)
