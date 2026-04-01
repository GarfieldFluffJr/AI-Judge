export interface Judge {
  id: string;
  name: string;
  systemPrompt: string;
  targetModel: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JudgeFormData {
  name: string;
  systemPrompt: string;
  targetModel: string;
  active: boolean;
}
