export type DocumentCreateRequest = {
  title: string;
  content: string;
};

export type DocumentUpdateRequest = {
  title: string;
  content: string;
};

export type DocumentResponse = {
  id: number;
  shareId: string;
  ownerId: number;
  ownerUserName: string;
  isOwner: boolean;
  accessRole: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentHistoryItem = {
  id: number;
  changeType: string;
  description: string;
  createdAt: string;
  userName: string;
};
