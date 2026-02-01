export type ItemType = "goal" | "task";

export interface SuggestionItem {
  id: string;
  type: ItemType;
  text: string;
  status?: "idle" | "loading";
  selected?: boolean;
}

export interface StreamChunk {
  type: ItemType;
  id: string;
  text: string;
}
