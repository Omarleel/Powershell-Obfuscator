const randomName = (len = 8) => {
    const c = 'abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let r = c[Math.floor(Math.random() * 52)];
    for (let i = 0; i < len - 1; i++) r += c[Math.floor(Math.random() * c.length)];
    return r;
};

const obfuscate = (code, useStrings, useGzip, oneLineOnly) => {
    let script = code;

    const strings = [];
    const stringCaptureRegex = /(["'])(?:(?!\1)[\s\S]|`(?:\1|`)|\\?(?:\1|\\?))*?\1/g;
    script = script.replace(stringCaptureRegex, match => {
        strings.push(match);
        return `__STR_${strings.length - 1}__`;
    });

    script = script.replace(/`\s*[\r\n]+\s*/g, ' ');

    let lines = script.replace(/<#[\s\S]*?#>/g, '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

    let scriptCollapsed = lines[0] || '';
    for (let i = 1; i < lines.length; i++) {
        let prev = scriptCollapsed.trim();
        let curr = lines[i].trim();
        
        const endsWithContinuation = /[{(,;|=+\-*&\\[]$/i;
        const startsWithContinuation = /^[})\]|;=+\-*]/i; 
        
        const startsWithBlockOrSwitch = /^(?:{|default\b|param\b|catch\b|finally\b|else\b|elseif\b|process\b|begin\b|end\b)/i;
        
        if (endsWithContinuation.test(prev) || startsWithContinuation.test(curr) || startsWithBlockOrSwitch.test(curr)) {
            scriptCollapsed += ' ' + curr;
        } else if (prev.endsWith(']') && curr.startsWith('[')) {
            scriptCollapsed += ' ' + curr;
        } else if (prev.endsWith('}') && curr.startsWith('{')) {
            scriptCollapsed += ' ' + curr;
        } else {
            scriptCollapsed += ';' + curr;
        }
    }
    script = scriptCollapsed;

    if (!oneLineOnly) {
        const reservedVars = new Set([
            'true', 'false', 'null', '_', 'args', 'error', 'pid', 'home', 'host', 'psitem', 'this', 'input',
            'progresspreference', 'erroractionpreference', 'verbosepreference', 'warningpreference',
            'debugpreference', 'informationpreference', 'psversiontable', 'psboundparameters',
            'psscriptroot', 'stacktrace', 'ofs', 'matches', 'lastexitcode', 'profile', 'pwd',
            'pscmdlet', 'myinvocation'
        ]);
        const varMap = new Map();

        script = script.replace(/\$([a-zA-Z0-9_:]+)/g, (match, name) => {
            let cleanName = name.includes(':') ? name.split(':')[1] : name;
            let scopeName = name.includes(':') ? name.split(':')[0] + ':' : '';
            
            if (reservedVars.has(cleanName.toLowerCase()) || name.toLowerCase().startsWith('env:')) return match;
            if (!varMap.has(cleanName)) varMap.set(cleanName, randomName());
            return '$' + scopeName + varMap.get(cleanName);
        });

        for (let i = 0; i < strings.length; i++) {
            if (strings[i].startsWith('"')) {
                strings[i] = strings[i].replace(/\$([a-zA-Z0-9_:]+)/g, (match, name) => {
                    let cleanName = name.includes(':') ? name.split(':')[1] : name;
                    let scopeName = name.includes(':') ? name.split(':')[0] + ':' : '';
                    
                    if (reservedVars.has(cleanName.toLowerCase()) || name.toLowerCase().startsWith('env:')) return match;
                    if (!varMap.has(cleanName)) varMap.set(cleanName, randomName());
                    return '$' + scopeName + varMap.get(cleanName);
                });
            }
        }

        script = script.replace(/(?<!function\s+)\b([a-zA-Z]+)-([a-zA-Z]+)\b/gi, (m, v, s) => {
            if (m.startsWith('__STR_')) return m;
            const fragV = v.split('').join('"+"');
            const fragS = s.split('').join('"+"');
            return `&((gcm ("${fragV}"+"-"+"${fragS}")).Name)`;
        });
    }

    script = script.replace(/__STR_(\d+)__/g, (m, idx) => strings[idx]);

    if (useStrings && !oneLineOnly) {
        script = script.replace(stringCaptureRegex, (match, quote) => {
            const content = match.slice(1, -1);
            if (content.includes('$') || content.includes('`') || content.length < 2) return match;
            
            if (Math.random() > 0.5) {
                const bytes = Array.from(content).map(c => c.charCodeAt(0));
                return `([char[]](${bytes.join(',')})-join'')`;
            } else {
                const bytes = new TextEncoder().encode(content);
                const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
                const b64 = btoa(binString);
                return `([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')))`;
            }
        });
    }

    script = script.replace(/\s*([|;,])\s*/g, '$1');
    script = script.replace(/;+/g, ';');
    script = script.replace(/`(?=[;\s])/g, '');

    if (useGzip && !oneLineOnly) {
        const encoder = new TextEncoder();
        const data = encoder.encode(script);
        const binString = Array.from(data, byte => String.fromCharCode(byte)).join("");
        const b64Final = btoa(binString);
        const iexBypass = `( $SHeLLiD[1]+$shELlid[13]+'x')`;
        return `$h = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64Final}')); &${iexBypass} $h`;
    }

    return script;
};

const ejecutar = () => {
    const input = document.getElementById('inputArea').value;
    const useStrings = document.getElementById('checkStrings').checked;
    const useGzip = document.getElementById('checkFull').checked;
    const oneLineOnly = document.getElementById('checkOneLineOnly').checked;

    if (!input.trim()) return alert("Ingresa código");

    try {
        document.getElementById('outputArea').value = obfuscate(input, useStrings, useGzip, oneLineOnly);
        document.getElementById('errorMsg').innerText = '';
    } catch (e) {
        document.getElementById('errorMsg').innerText = "Error: " + e.message;
    }
};

const copiar = async () => {
    const area = document.getElementById('outputArea');
    area.select();
    try {
        await navigator.clipboard.writeText(area.value);
    } catch (err) {
        console.error('Error al intentar copiar:', err);
    }
};