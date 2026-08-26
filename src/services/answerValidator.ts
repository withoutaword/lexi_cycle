import type { VocabularySource } from '../domain/vocabulary'
export const normalizeAnswer = (value:string) => value.trim().toLocaleLowerCase().replace(/\s+/g,' ')
export const isCorrectAnswer = (value:string, card:Pick<VocabularySource,'answer'|'aliases'>) => [card.answer,...(card.aliases ?? [])].some(answer => normalizeAnswer(answer) === normalizeAnswer(value))
