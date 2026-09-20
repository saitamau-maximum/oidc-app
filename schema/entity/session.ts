export type SessionUser = {
  id: string;
  name: string;
  displayId?: string | null;
  picture?: string | null;
};

export type Session = Omit<SessionUser, "id"> & {
  id: string;
  userId: string;
  expires: number;
};
