"""
Adaptive Story Word Selector — ML-informed word ranking for story generation.

Replaces the naive "words where dueDate <= today" selector with a multi-signal
scoring function that combines DKT forgetting risk, recency penalties,
production gaps, module variety, and thematic relevance.

Runs as a standalone Python microservice on port 8300.
"""

__version__ = "0.1.0"
