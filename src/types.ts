export type AdviceRequest = {
  message: string;
  relationType: string;
  chatGoal: string;
  replyStyle: string;
};

export type AdviceResult = {
  emotion_analysis: string;
  avoid_reply: string;
  replies: {
    natural: string;
    humorous: string;
    warm: string;
    progressive: string;
  };
  best_reply: string;
  reason: string;
};
