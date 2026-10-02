import {defineField} from 'sanity'

// Short helpers for the plain fields most types are made of
export const str = (name: string, description?: string) => defineField({name, type: 'string', description})
export const num = (name: string, description?: string) => defineField({name, type: 'number', description})
export const bool = (name: string, description?: string) => defineField({name, type: 'boolean', description})
export const ref = (name: string, to: string) => defineField({name, type: 'reference', to: [{type: to}]})
