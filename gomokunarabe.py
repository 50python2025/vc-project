import tkinter as tk
from tkinter import messagebox
import random
import time


class RenjuApp:
    def __init__(self, root):
        self.root = root
        self.root.title("連珠 - 19x19 (強化AI)")
        self.board_size = 19
        self.board = [
            [0] * self.board_size for _ in range(self.board_size)
        ]  # 0:空, 1:黒, 2:白
        self.current_player = 1
        self.cell_size = 25
        self.canvas = tk.Canvas(
            root,
            width=self.cell_size * (self.board_size - 1) + 20,
            height=self.cell_size * (self.board_size - 1) + 20,
        )
        self.canvas.pack(padx=10, pady=10)
        self.draw_board()
        self.canvas.bind("<Button-1>", self.place_stone)
        self.game_over = False
        self.last_move = None

    def draw_board(self):
        for i in range(self.board_size):
            self.canvas.create_line(
                10,
                10 + i * self.cell_size,
                10 + (self.board_size - 1) * self.cell_size,
                10 + i * self.cell_size,
            )
            self.canvas.create_line(
                10 + i * self.cell_size,
                10,
                10 + i * self.cell_size,
                10 + (self.board_size - 1) * self.cell_size,
            )
        for x, y in [(3, 3), (3, 15), (15, 3), (15, 15), (9, 9)]:
            self.canvas.create_oval(
                10 + x * self.cell_size - 3,
                10 + y * self.cell_size - 3,
                10 + x * self.cell_size + 3,
                10 + y * self.cell_size + 3,
                fill="black",
            )

    def place_stone(self, event):
        if self.game_over or self.current_player == 2:
            return
        x = round((event.x - 10) / self.cell_size)
        y = round((event.y - 10) / self.cell_size)
        if self.is_valid_move(x, y):
            self.make_move(x, y, self.current_player)
            self.last_move = (x, y)
            if not self.game_over:
                self.root.after(500, self.computer_move)

    def is_valid_move(self, x, y):
        if not (
            0 <= x < self.board_size
            and 0 <= y < self.board_size
            and self.board[x][y] == 0
        ):
            return False
        if self.current_player == 1 and self.is_forbidden_move(x, y):
            messagebox.showwarning(
                "禁じ手", "黒は三三、四四、六連以上の手を打てません！"
            )
            return False
        return True

    def make_move(self, x, y, player):
        self.board[x][y] = player
        color = "black" if player == 1 else "white"
        self.canvas.create_oval(
            10 + x * self.cell_size - 10,
            10 + y * self.cell_size - 10,
            10 + x * self.cell_size + 10,
            10 + y * self.cell_size + 10,
            fill=color,
        )
        if self.check_winner(x, y):
            messagebox.showinfo(
                "勝利", f"{'黒' if player == 1 else '白'} が勝ちました！"
            )
            self.game_over = True
        elif all(
            self.board[i][j] != 0
            for i in range(self.board_size)
            for j in range(self.board_size)
        ):
            messagebox.showinfo("終了", "引き分けです！")
            self.game_over = True
        else:
            self.current_player = 3 - player

    def check_winner(self, x, y):
        player = self.board[x][y]
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dx, dy in directions:
            count = 1
            positions = [(x, y)]
            # 右側をチェック
            i, j = x + dx, y + dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == player
            ):
                count += 1
                positions.append((i, j))
                i += dx
                j += dy
            # 左側をチェック
            i, j = x - dx, y - dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == player
            ):
                count += 1
                positions.insert(0, (i, j))  # 左側は先頭に追加
                i -= dx
                j -= dy
            if count == 5:  # 厳密に5連続のみ
                print(
                    f"Winner detected: Player {player} with line {positions} (count: {count})"
                )
                return True
        return False

    def is_forbidden_move(self, x, y):
        self.board[x][y] = 1
        forbidden = (
            self.check_three_three(x, y)
            or self.check_four_four(x, y)
            or self.check_overline(x, y)
        )
        self.board[x][y] = 0
        return forbidden

    def check_three_three(self, x, y):
        threes = 0
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dx, dy in directions:
            if self.count_open_three(x, y, dx, dy, 1):
                threes += 1
                print(
                    f"Open three detected in direction ({dx}, {dy}) at {x},{y}: {self.get_three_positions(x, y, dx, dy)}"
                )
        return threes >= 2

    def check_four_four(self, x, y):
        fours = 0
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dx, dy in directions:
            if self.count_open_four(x, y, dx, dy, 1):
                fours += 1
        return fours >= 2

    def check_overline(self, x, y):
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dx, dy in directions:
            count = 1
            i, j = x + dx, y + dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 1
            ):
                count += 1
                i += dx
                j += dy
            i, j = x - dx, y - dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 1
            ):
                count += 1
                i -= dx
                j += dy
            if count > 5:
                return True
        return False

    def count_open_three(self, x, y, dx, dy, player):
        positions = [(x, y)]
        i, j = x + dx, y + dy
        while (
            0 <= i < self.board_size
            and 0 <= j < self.board_size
            and self.board[i][j] == player
        ):
            positions.append((i, j))
            i += dx
            j += dy
        before_x, before_y = x - dx, y - dy
        after_x, after_y = i, j
        # 両端が空いている場合にのみ活三と判定
        if (
            len(positions) == 3
            and (
                0 <= before_x < self.board_size
                and 0 <= before_y < self.board_size
                and self.board[before_x][before_y] == 0
            )
            and (
                0 <= after_x < self.board_size
                and 0 <= after_y < self.board_size
                and self.board[after_x][after_y] == 0
            )
        ):
            return True
        return False

    def get_three_positions(self, x, y, dx, dy):
        positions = [(x, y)]
        i, j = x + dx, y + dy
        while (
            0 <= i < self.board_size
            and 0 <= j < self.board_size
            and self.board[i][j] == 1
        ):
            positions.append((i, j))
            i += dx
            j += dy
        i, j = x - dx, y - dy
        while (
            0 <= i < self.board_size
            and 0 <= j < self.board_size
            and self.board[i][j] == 1
        ):
            positions.insert(0, (i, j))
            i -= dx
            j -= dy
        return positions[:3]  # 3つまで

    def count_open_four(self, x, y, dx, dy, player):
        positions = [(x, y)]
        i, j = x + dx, y + dy
        while (
            0 <= i < self.board_size
            and 0 <= j < self.board_size
            and self.board[i][j] == player
        ):
            positions.append((i, j))
            i += dx
            j += dy
        before_x, before_y = x - dx, y - dy
        after_x, after_y = i, j
        open_ends = 0
        if (
            0 <= before_x < self.board_size
            and 0 <= before_y < self.board_size
            and self.board[before_x][before_y] == 0
        ):
            open_ends += 1
        if (
            0 <= after_x < self.board_size
            and 0 <= after_y < self.board_size
            and self.board[after_x][after_y] == 0
        ):
            open_ends += 1
        if len(positions) == 4 and open_ends > 0:
            return True
        return False

    def count_jump_three(self, x, y, dx, dy, player):
        positions = [(x, y)]
        i, j = x + dx, y + dy
        gap_count = 0
        while 0 <= i < self.board_size and 0 <= j < self.board_size:
            if self.board[i][j] == player:
                positions.append((i, j))
            elif self.board[i][j] == 0 and gap_count == 0:
                gap_count += 1
                gap_x, gap_y = i, j
            else:
                break
            i += dx
            j += dy
        before_x, before_y = x - dx, y - dy
        after_x, after_y = i, j
        if (
            len(positions) == 3
            and gap_count == 1
            and (
                0 <= before_x < self.board_size
                and 0 <= before_y < self.board_size
                and self.board[before_x][before_y] == 0
                or 0 <= after_x < self.board_size
                and 0 <= after_y < self.board_size
                and self.board[after_x][after_y] == 0
            )
        ):
            return (True, gap_x, gap_y)
        return (False, None, None)

    def count_jump_four(self, x, y, dx, dy, player):
        positions = [(x, y)]
        i, j = x + dx, y + dy
        gap_count = 0
        gap_x, gap_y = None, None
        while 0 <= i < self.board_size and 0 <= j < self.board_size:
            if self.board[i][j] == player:
                positions.append((i, j))
            elif self.board[i][j] == 0 and gap_count == 0:
                gap_count += 1
                gap_x, gap_y = i, j
            else:
                break
            i += dx
            j += dy
        before_x, before_y = x - dx, y - dy
        after_x, after_y = i, j
        if (
            len(positions) == 4
            and gap_count == 1
            and (
                0 <= before_x < self.board_size
                and 0 <= before_y < self.board_size
                and self.board[before_x][before_y] == 0
                or 0 <= after_x < self.board_size
                and 0 <= after_y < self.board_size
                and self.board[after_x][after_y] == 0
            )
        ):
            return (True, gap_x, gap_y)
        if len(positions) >= 2:
            second_x, second_y = positions[1]
            if (
                0 <= second_x + dx < self.board_size
                and 0 <= second_y + dy < self.board_size
                and self.board[second_x + dx][second_y + dy] == 0
                and 0 <= second_x + 2 * dx < self.board_size
                and 0 <= second_y + 2 * dy < self.board_size
                and self.board[second_x + 2 * dx][second_y + 2 * dy] == player
                and 0 <= second_x + 3 * dx < self.board_size
                and 0 <= second_y + 3 * dy < self.board_size
                and self.board[second_x + 3 * dx][second_y + 3 * dy] == player
            ):
                gap_x, gap_y = second_x + dx, second_y + dy
                positions = [
                    (x, y),
                    (second_x, second_y),
                    (second_x + 2 * dx, second_y + 2 * dy),
                    (second_x + 3 * dx, second_y + 3 * dy),
                ]
                before_open = (
                    0 <= before_x < self.board_size
                    and 0 <= before_y < self.board_size
                    and self.board[before_x][before_y] == 0
                )
                after_open = (
                    0 <= second_x + 4 * dx < self.board_size
                    and 0 <= second_y + 4 * dy < self.board_size
                    and self.board[second_x + 4 * dx][second_y + 4 * dy] == 0
                )
                if before_open or after_open:
                    return (True, gap_x, gap_y)
        return (False, None, None)

    def evaluate_position(self, x, y, player):
        score = 0
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        self.board[x][y] = player
        opponent = 3 - player

        for dx, dy in directions:
            count = 1
            open_ends = 0
            i, j = x + dx, y + dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == player
            ):
                count += 1
                i += dx
                j += dy
            after_open = (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 0
            )
            if after_open:
                open_ends += 1
            i, j = x - dx, y - dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == player
            ):
                count += 1
                i -= dx
                j += dy
            before_open = (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 0
            )
            if before_open:
                open_ends += 1

            if count >= 5:
                score += 100000 if player == 2 else -100000
            elif count == 4 and open_ends == 2:
                score += 30000 if player == 2 else -25000
            elif count == 4 and open_ends == 1:
                score += 15000 if player == 2 else -15000
            elif count == 3 and open_ends == 2:
                score += 8000 if player == 2 else -7000
            elif count == 3 and open_ends == 1:
                score += 2000 if player == 2 else -1500
            elif count == 2 and open_ends == 2:
                score += 500 if player == 2 else -300

            jump_three, _, _ = self.count_jump_three(x, y, dx, dy, player)
            if jump_three:
                score += 6000 if player == 2 else -4000
            jump_four, _, _ = self.count_jump_four(x, y, dx, dy, player)
            if jump_four:
                score += 20000 if player == 2 else -20000

            count = 0
            open_ends = 0
            i, j = x + dx, y + dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == opponent
            ):
                count += 1
                i += dx
                j += dy
            after_open = (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 0
            )
            if after_open:
                open_ends += 1
            i, j = x - dx, y - dy
            while (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == opponent
            ):
                count += 1
                i -= dx
                j += dy
            before_open = (
                0 <= i < self.board_size
                and 0 <= j < self.board_size
                and self.board[i][j] == 0
            )
            if before_open:
                open_ends += 1
            if count == 4 and open_ends >= 1:
                score += 60000
            elif count == 3 and open_ends == 2:
                score += 30000
            elif count == 3 and open_ends == 1:
                score += 8000
            elif count == 2 and open_ends == 2:
                score += 500

            jump_three, _, _ = self.count_jump_three(x, y, dx, dy, opponent)
            if jump_three:
                score += 15000
            jump_four, _, _ = self.count_jump_four(x, y, dx, dy, opponent)
            if jump_four:
                score += 50000

        self.board[x][y] = 0
        return score

    def check_immediate_threats(self):
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        cells = self.get_all_empty_cells()
        # 白の勝利をチェック（5連続のみ）
        for x, y in cells:
            self.board[x][y] = 2
            if self.check_winner(x, y):
                self.board[x][y] = 0
                print(f"White wins at {x},{y}")
                return (x, y)
            self.board[x][y] = 0

        # 白の活四をチェック（防御優先）
        for x in range(self.board_size):
            for y in range(self.board_size):
                if self.board[x][y] == 2:
                    for dx, dy in directions:
                        positions = [(x, y)]
                        i, j = x + dx, y + dy
                        while (
                            0 <= i < self.board_size
                            and 0 <= j < self.board_size
                            and self.board[i][j] == 2
                        ):
                            positions.append((i, j))
                            i += dx
                            j += dy
                        before_x, before_y = x - dx, y - dy
                        after_x, after_y = i, j
                        if len(positions) == 4 and (
                            (
                                0 <= before_x < self.board_size
                                and 0 <= before_y < self.board_size
                                and self.board[before_x][before_y] == 0
                            )
                            or (
                                0 <= after_x < self.board_size
                                and 0 <= after_y < self.board_size
                                and self.board[after_x][after_y] == 0
                            )
                        ):
                            if (
                                0 <= before_x < self.board_size
                                and 0 <= before_y < self.board_size
                                and self.board[before_x][before_y] == 0
                            ):
                                print(
                                    f"Detected white open four: {positions}, blocking at {before_x},{before_y}"
                                )
                                return (before_x, before_y)
                            elif (
                                0 <= after_x < self.board_size
                                and 0 <= after_y < self.board_size
                                and self.board[after_x][after_y] == 0
                            ):
                                print(
                                    f"Detected white open four: {positions}, blocking at {after_x},{after_y}"
                                )
                                return (after_x, after_y)

        # 黒の飛び四をチェック
        for x in range(self.board_size):
            for y in range(self.board_size):
                if self.board[x][y] == 1:
                    for dx, dy in directions:
                        jump_four, gap_x, gap_y = self.count_jump_four(x, y, dx, dy, 1)
                        if jump_four:
                            positions = [(x, y)]
                            i, j = x + dx, y + dy
                            while (
                                0 <= i < self.board_size
                                and 0 <= j < self.board_size
                                and (
                                    self.board[i][j] == 1 or (i == gap_x and j == gap_y)
                                )
                            ):
                                if self.board[i][j] == 1:
                                    positions.append((i, j))
                                i += dx
                                j += dy
                            print(
                                f"Detected black jump four: {positions}, blocking at {gap_x},{gap_y}"
                            )
                            return (gap_x, gap_y)

        # 黒の四をチェック
        for x in range(self.board_size):
            for y in range(self.board_size):
                if self.board[x][y] == 1:
                    for dx, dy in directions:
                        positions = [(x, y)]
                        i, j = x + dx, y + dy
                        while (
                            0 <= i < self.board_size
                            and 0 <= j < self.board_size
                            and self.board[i][j] == 1
                        ):
                            positions.append((i, j))
                            i += dx
                            j += dy
                        before_x, before_y = x - dx, y - dy
                        after_x, after_y = i, j
                        before_open = (
                            0 <= before_x < self.board_size
                            and 0 <= before_y < self.board_size
                            and self.board[before_x][before_y] == 0
                        )
                        after_open = (
                            0 <= after_x < self.board_size
                            and 0 <= after_y < self.board_size
                            and self.board[after_x][after_y] == 0
                        )
                        open_ends = (1 if before_open else 0) + (1 if after_open else 0)
                        if len(positions) == 4 and open_ends > 0:
                            if open_ends == 2:
                                print(
                                    f"Detected black open four: {positions}, blocking at {before_x},{before_y}"
                                )
                                return (before_x, before_y)
                            elif before_open:
                                print(
                                    f"Detected black four: {positions}, blocking at {before_x},{before_y}"
                                )
                                return (before_x, before_y)
                            elif after_open:
                                print(
                                    f"Detected black four: {positions}, blocking at {after_x},{after_y}"
                                )
                                return (after_x, after_y)

        # 黒の活三をチェック
        for x in range(self.board_size):
            for y in range(self.board_size):
                if self.board[x][y] == 1:
                    for dx, dy in directions:
                        positions = [(x, y)]
                        i, j = x + dx, y + dy
                        while (
                            0 <= i < self.board_size
                            and 0 <= j < self.board_size
                            and self.board[i][j] == 1
                        ):
                            positions.append((i, j))
                            i += dx
                            j += dy
                        before_x, before_y = x - dx, y - dy
                        after_x, after_y = i, j
                        if len(positions) == 3 and (
                            0 <= before_x < self.board_size
                            and 0 <= before_y < self.board_size
                            and self.board[before_x][before_y] == 0
                            and 0 <= after_x < self.board_size
                            and 0 <= after_y < self.board_size
                            and self.board[after_x][after_y] == 0
                        ):
                            print(
                                f"Detected black open three: {positions}, blocking at {before_x},{before_y}"
                            )
                            return (before_x, before_y)

        # 黒の飛び三をチェック
        for x in range(self.board_size):
            for y in range(self.board_size):
                if self.board[x][y] == 1:
                    for dx, dy in directions:
                        jump_three, gap_x, gap_y = self.count_jump_three(
                            x, y, dx, dy, 1
                        )
                        if jump_three:
                            positions = [(x, y)]
                            i, j = x + dx, y + dy
                            while (
                                0 <= i < self.board_size
                                and 0 <= j < self.board_size
                                and (
                                    self.board[i][j] == 1 or (i == gap_x and j == gap_y)
                                )
                            ):
                                if self.board[i][j] == 1:
                                    positions.append((i, j))
                                i += dx
                                j += dy
                            print(
                                f"Detected black jump three: {positions}, blocking at {gap_x},{gap_y}"
                            )
                            return (gap_x, gap_y)

        # 黒の勝利をブロック
        for x, y in cells:
            self.board[x][y] = 1
            if self.check_winner(x, y) and not self.is_forbidden_move(x, y):
                self.board[x][y] = 0
                print(f"Block black win at {x},{y}")
                return (x, y)
            self.board[x][y] = 0

        return None

    def get_all_empty_cells(self):
        return [
            (i, j)
            for i in range(self.board_size)
            for j in range(self.board_size)
            if self.board[i][j] == 0
        ]

    def minimax(self, depth, alpha, beta, maximizing_player, deadline):
        if depth == 0 or self.game_over or time.time() > deadline:
            return self.evaluate_board()

        empty_cells = self.get_relevant_cells()
        if not empty_cells:
            return 0

        if maximizing_player:
            max_eval = float("-inf")
            for x, y in empty_cells:
                self.board[x][y] = 2
                eval = self.minimax(depth - 1, alpha, beta, False, deadline)
                self.board[x][y] = 0
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float("inf")
            for x, y in empty_cells:
                if not self.is_forbidden_move(x, y):
                    self.board[x][y] = 1
                    eval = self.minimax(depth - 1, alpha, beta, True, deadline)
                    self.board[x][y] = 0
                    min_eval = min(min_eval, eval)
                    beta = min(beta, eval)
                    if beta <= alpha:
                        break
            return min_eval

    def evaluate_board(self):
        score = 0
        for x, y in self.get_relevant_cells():
            score += self.evaluate_position(x, y, 2)
            score -= self.evaluate_position(x, y, 1)
        return score

    def get_relevant_cells(self):
        if not self.last_move:
            return [(9, 9)]
        x, y = self.last_move
        cells = []
        for i in range(max(0, x - 4), min(self.board_size, x + 5)):
            for j in range(max(0, y - 4), min(self.board_size, y + 5)):
                if self.board[i][j] == 0:
                    cells.append((i, j))
        cells.sort(
            key=lambda pos: self.evaluate_position(pos[0], pos[1], 2), reverse=True
        )
        return cells[:20]

    def computer_move(self):
        if self.game_over:
            return
        # 初手: 黒の隣（8方向）に置く
        black_stones = [
            (i, j)
            for i in range(self.board_size)
            for j in range(self.board_size)
            if self.board[i][j] == 1
        ]
        if len(black_stones) == 1:  # 黒が1手だけ置いた場合
            x, y = black_stones[0]
            adjacent = [
                (x + 1, y),
                (x - 1, y),
                (x, y + 1),
                (x, y - 1),  # 上下左右
                (x + 1, y + 1),
                (x + 1, y - 1),
                (x - 1, y + 1),
                (x - 1, y - 1),
            ]  # 斜め
            valid_adjacent = [
                (adj_x, adj_y)
                for adj_x, adj_y in adjacent
                if 0 <= adj_x < self.board_size
                and 0 <= adj_y < self.board_size
                and self.board[adj_x][adj_y] == 0
            ]
            if valid_adjacent:
                adj_x, adj_y = random.choice(valid_adjacent)
                self.make_move(adj_x, adj_y, 2)
                return

        start_time = time.time()
        deadline = start_time + 2.0

        immediate_move = self.check_immediate_threats()
        if immediate_move:
            x, y = immediate_move
            self.make_move(x, y, 2)
            return

        best_score = float("-inf")
        best_move = None
        depth = 4  # 深さを4に増加

        cells = self.get_relevant_cells()
        for x, y in cells:
            self.board[x][y] = 2
            score = self.minimax(depth, float("-inf"), float("inf"), False, deadline)
            self.board[x][y] = 0
            if score > best_score:
                best_score = score
                best_move = (x, y)
            if time.time() > deadline:
                break

        if best_move:
            x, y = best_move
        else:
            empty_cells = self.get_all_empty_cells()
            x, y = random.choice(empty_cells)
        self.make_move(x, y, 2)


if __name__ == "__main__":
    root = tk.Tk()
    app = RenjuApp(root)
    root.mainloop()
