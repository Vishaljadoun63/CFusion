/**
 * CFusion - Competitive Programming Starter Templates
 * Pre-configured boilerplates for C++17, C++20, Python 3, and Java 17
 */

export const STARTER_TEMPLATES = {
  cpp17: `/**
 * Problem: \${problemTitle}
 * Language: C++17 (gcc 11)
 */
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

void solve() {
    // Your solution here
    int w;
    if (!(cin >> w)) return;
    
    if (w > 2 && w % 2 == 0) {
        cout << "YES\\n";
    } else {
        cout << "NO\\n";
    }
}

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    // cin >> t; // Uncomment for multi-test cases
    while (t--) {
        solve();
    }
    return 0;
}
`,

  cpp20: `/**
 * Problem: \${problemTitle}
 * Language: C++20 (gcc 13)
 */
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <span>
#include <ranges>

using namespace std;

void solve() {
    // Your solution here
    int w;
    if (!(cin >> w)) return;

    if (w > 2 && w % 2 == 0) {
        cout << "YES\\n";
    } else {
        cout << "NO\\n";
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    // cin >> t; // Uncomment for multi-test cases
    while (t--) {
        solve();
    }
    return 0;
}
`,

  python3: `"""
Problem: \${problemTitle}
Language: Python 3 (3.11)
"""
import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    
    # Your solution here
    w = int(input_data[0])
    if w > 2 and w % 2 == 0:
        print("YES")
    else:
        print("NO")

if __name__ == '__main__':
    solve()
`,

  java: `/**
 * Problem: \${problemTitle}
 * Language: Java 17 (OpenJDK 17)
 */
import java.util.Scanner;
import java.io.PrintWriter;
import java.io.BufferedOutputStream;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        PrintWriter out = new PrintWriter(new BufferedOutputStream(System.out));

        if (in.hasNextInt()) {
            int w = in.nextInt();
            if (w > 2 && w % 2 == 0) {
                out.println("YES");
            } else {
                out.println("NO");
            }
        }

        out.flush();
    }
}
`
};

export const LANGUAGE_METADATA = {
  cpp17: {
    id: 'cpp17',
    monacoLang: 'cpp',
    filename: 'solution.cpp',
    label: 'C++17 (gcc 11)'
  },
  cpp20: {
    id: 'cpp20',
    monacoLang: 'cpp',
    filename: 'solution.cpp',
    label: 'C++20 (gcc 13)'
  },
  python3: {
    id: 'python3',
    monacoLang: 'python',
    filename: 'solution.py',
    label: 'Python 3 (3.11)'
  },
  java: {
    id: 'java',
    monacoLang: 'java',
    filename: 'Main.java',
    label: 'Java 17 (OpenJDK 17)'
  }
};

/**
 * Generate starter template with problem metadata injected
 */
export function getStarterTemplate(langId, problemTitle = 'Codeforces Problem') {
  const template = STARTER_TEMPLATES[langId] || STARTER_TEMPLATES.cpp17;
  return template.replace(/\$\{problemTitle\}/g, problemTitle);
}
