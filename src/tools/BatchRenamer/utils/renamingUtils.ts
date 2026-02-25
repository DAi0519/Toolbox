export type RenameRule = 
  | { type: 'replace'; find: string; replace: string; useRegex: boolean; caseSensitive: boolean }
  | { type: 'prefix'; value: string }
  | { type: 'suffix'; value: string }
  | { type: 'case'; value: 'upper' | 'lower' | 'title' }
  | { type: 'numbering'; start: number; step: number; format: string }
  | { type: 'rename'; value: string };

export interface FileItem {
  id: string;
  originalFile: File;
  originalName: string;
  originalDir: string;
  newName: string;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const applyRules = (name: string, rules: RenameRule[], index: number): string => {
  let currentName = name;
  const nameParts = currentName.split('.');
  const ext = nameParts.length > 1 ? nameParts.pop() : '';
  let baseName = nameParts.join('.');

  rules.forEach(rule => {
    switch (rule.type) {
      case 'rename':
        baseName = rule.value || '';
        break;
      case 'replace':
        if (rule.find) {
          const flags = rule.caseSensitive ? 'g' : 'gi';
          try {
            const pattern = rule.useRegex ? rule.find : escapeRegExp(rule.find);
            baseName = baseName.replace(new RegExp(pattern, flags), rule.replace);
          } catch (e) {
            // Invalid regex, ignore
          }
        }
        break;
      case 'prefix':
        baseName = rule.value + baseName;
        break;
      case 'suffix':
        baseName = baseName + rule.value;
        break;
      case 'case':
        if (rule.value === 'upper') baseName = baseName.toUpperCase();
        if (rule.value === 'lower') baseName = baseName.toLowerCase();
        if (rule.value === 'title') baseName = baseName.replace(/\b\w/g, c => c.toUpperCase());
        break;
      case 'numbering':
        const num = rule.start + (index * rule.step);
        const numStr = num.toString().padStart(rule.format.length, '0');
        baseName = baseName + numStr;
        break;
    }
  });

  return ext ? `${baseName}.${ext}` : baseName;
};

export const renumberSequentially = (items: FileItem[]): FileItem[] => {
  // Group by prefix + suffix to identify sequences
  // Key: "Dir|Prefix|Ext" -> Value: [indices]
  const groups = new Map<string, number[]>();
  const pattern = /^(.*?)(\d+)(\.[^.]+)?$/;

  items.forEach((item, index) => {
    const match = item.newName.match(pattern);
    if (match) {
      // Include directory to avoid renumbering across different folders.
      const dir = item.originalDir ?? '';
      const key = `${dir}|||${match[1]}|||${match[3] || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(index);
    }
  });

  const result = [...items];

  groups.forEach((indices) => {
    // Only renumber if we have items
    // Even if 1 item, user requested "1, 2, 3..." so "A_5" -> "A_1"
    
    indices.forEach((itemIndex, seqIndex) => {
      const item = result[itemIndex];
      const match = item.newName.match(pattern)!;
      const prefix = match[1];
      // const oldNum = match[2]; // Unused
      const ext = match[3] || '';
      
      // New number starts at 1
      const newNum = seqIndex + 1;
      
      result[itemIndex] = {
        ...item,
        newName: `${prefix}${newNum}${ext}`
      };
    });
  });

  return result;
};

export const resolveConflicts = (items: FileItem[]): FileItem[] => {
  const usedPaths = new Set<string>();
  
  return items.map(item => {
    let name = item.newName;
    let attempts = 0;
    const dir = item.originalDir ?? '';
    const makeKey = (candidate: string) => (dir ? `${dir}/${candidate}` : candidate);
    
    // If name is already taken, try to resolve
    while (usedPaths.has(makeKey(name)) && attempts < 100) {
      // Try to find a number at the end of the filename (before extension)
      const match = name.match(/^(.*?)(\d+)(\.[^.]+)?$/);
      
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const ext = match[3] || '';
        const num = parseInt(numStr);
        
        // Increment
        const nextNum = num + 1;
        // Preserve padding if possible, but simple increment is safer for conflict resolution
        const nextNumStr = nextNum.toString().padStart(numStr.length, '0');
        
        name = `${prefix}${nextNumStr}${ext}`;
      } else {
        // No number found, append _1
        const parts = name.split('.');
        const ext = parts.length > 1 ? '.' + parts.pop() : '';
        const base = parts.join('.');
        name = `${base}_1${ext}`;
      }
      attempts++;
    }
    
    usedPaths.add(makeKey(name));
    return { ...item, newName: name };
  });
};
