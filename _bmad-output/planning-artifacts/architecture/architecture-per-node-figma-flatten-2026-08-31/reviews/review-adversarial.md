# Adversarial invariants review

Initial verdict: Two protocol holes and three high-risk seams.

Findings applied:

1. Auto and explicit choices are represented independently: `imageNodeIds` is the effective set while `forcePrimitiveBuild` carries explicit authority.
2. The modal submits the complete checked set with server auto-detection disabled, so unchecking an auto item remains meaningful.
3. `resolveForceImageIds` owns normalization after all enabled sources are combined; root, hidden, unknown, and selected descendants are removed.
4. Explicit missing exports fail before AST generation rather than producing a layout hole.
5. Forced desktop images receive a distinct marker and cannot be opportunistically replaced from an unrelated mobile frame.

Final verdict: Pass. The reviewed divergence points now have one enforceable owner and outcome.
