import { Regex } from '../core/Regex';

export class RegexParser {
  parseRegex(input: string): Regex {
    // Strip comments (everything from # to end of line) from each line
    const lines = input.split('\n');
    const cleanedLines = lines.map(line => {
      const commentIndex = line.indexOf('#');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex);
      }
      return line;
    });
    
    // Join lines back together and trim whitespace
    const cleanedInput = cleanedLines.join('\n').trim();
    
    // Pass cleaned input to Regex constructor
    return new Regex(cleanedInput);
  }

  static getDefaultYAML(): string {
    return `# Matches any binary string containing the substring 010
B = (0|1)*;  # subexpression matching any binary string
B 010 B`
  }
}