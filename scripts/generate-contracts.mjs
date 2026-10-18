import {schemas,recipeSchema} from '../mcp/dist/schemas/contracts.js';
import {z} from 'zod';import {writeFileSync} from 'node:fs';
writeFileSync('docs/tools.schema.json',JSON.stringify(Object.fromEntries(Object.entries(schemas).map(([k,v])=>[k,z.toJSONSchema(v)])),null,2));
writeFileSync('library/recipe.schema.json',JSON.stringify(z.toJSONSchema(recipeSchema),null,2));
