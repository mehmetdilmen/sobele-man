import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, SafeAreaView, PanResponder, GestureResponderEvent, PanResponderGestureState, Animated, Easing } from 'react-native';
import { Accelerometer } from 'expo-sensors';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor(width / GRID_SIZE);
const PLAYER_SIZE = CELL_SIZE - 4;
const ENEMY_SPEED = 0.3;
const GAME_TIME = 60;

interface Position {
  x: number;
  y: number;
}

interface Enemy {
  position: Position;
  direction: Position;
}

const isValidMove = (x: number, y: number, maze: number[][]): boolean => {
  const gridX = Math.floor(x);
  const gridY = Math.floor(y);
  return gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE && maze[gridY][gridX] !== 1;
};

const createMaze = () => {
  const maze = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
  
  // Duvarları oluştur
  for (let i = 0; i < GRID_SIZE; i++) {
    maze[0][i] = 1; // Üst duvar
    maze[GRID_SIZE-1][i] = 1; // Alt duvar
    maze[i][0] = 1; // Sol duvar
    maze[i][GRID_SIZE-1] = 1; // Sağ duvar
  }

  // İç duvarları oluştur
  for (let y = 2; y < GRID_SIZE - 2; y += 2) {
    for (let x = 2; x < GRID_SIZE - 2; x += 2) {
      maze[y][x] = 1;
      
      const directions = [
        { dx: 0, dy: -1 }, // yukarı
        { dx: 1, dy: 0 },  // sağ
        { dx: 0, dy: 1 },  // aşağı
        { dx: -1, dy: 0 }  // sol
      ];
      
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const newX = x + dir.dx;
      const newY = y + dir.dy;
      
      if (newX > 1 && newX < GRID_SIZE - 2 && newY > 1 && newY < GRID_SIZE - 2) {
        maze[newY][newX] = 1;
      }
    }
  }
  
  // Kapıyı yerleştir
  const exitX = GRID_SIZE - 2;
  const exitY = GRID_SIZE - 2;
  maze[exitY][exitX] = 2;
  
  return maze;
};

const createEnemies = (exitPos: Position, maze: number[][], playerPos: Position): Enemy[] => {
  const getRandomNearbyPosition = () => {
    let x, y;
    let attempts = 0;
    const MIN_DISTANCE = 5;
    
    do {
      x = exitPos.x + Math.floor(Math.random() * 3) - 1;
      y = exitPos.y + Math.floor(Math.random() * 3) - 1;
      attempts++;
      
      if (attempts > 10) {
        x = exitPos.x + Math.floor(Math.random() * 7) - 3;
        y = exitPos.y + Math.floor(Math.random() * 7) - 3;
      }
    } while (
      !isValidMove(x, y, maze) || 
      (x === exitPos.x && y === exitPos.y) ||
      Math.sqrt(Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2)) < MIN_DISTANCE
    );
    return { x, y };
  };

  const initialPosition = getRandomNearbyPosition();
  return [{
    position: initialPosition,
    direction: { x: 0, y: 0 }
  }];
};

export default function Page() {
  const [maze, setMaze] = useState(() => createMaze());
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const playerPosition = useRef(new Animated.ValueXY({ x: CELL_SIZE, y: CELL_SIZE })).current;
  const [enemies, setEnemies] = useState(() => createEnemies({ x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, maze, { x: 1, y: 1 }));
  const enemyPositions = useRef(enemies.map(() => new Animated.ValueXY())).current;
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [lastSwipeTime, setLastSwipeTime] = useState(0);
  const [direction, setDirection] = useState<Position>({ x: 0, y: 1 });
  const [isMoving, setIsMoving] = useState(false);
  const playerRotation = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const playerScale = useRef(new Animated.Value(1)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;
  const [enemyBlinking, setEnemyBlinking] = useState(false);
  const [mouthAngle, setMouthAngle] = useState(45);
  const mouthAngleAnim = useRef(new Animated.Value(45)).current;
  const playerGlowAnim = useRef(new Animated.Value(0)).current;

  const findPath = (start: Position, target: Position): Position[] => {
    const queue: Position[] = [start];
    const visited = new Set<string>();
    const parent = new Map<string, Position>();
    
    const getKey = (pos: Position) => `${Math.floor(pos.x)},${Math.floor(pos.y)}`;
    visited.add(getKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = getKey(current);

      if (Math.abs(current.x - target.x) < 1 && Math.abs(current.y - target.y) < 1) {
        const path: Position[] = [];
        let pos = current;
        while (parent.has(getKey(pos))) {
          path.unshift(pos);
          pos = parent.get(getKey(pos))!;
        }
        return path;
      }

      const directions = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
      ];

      for (const dir of directions) {
        const next: Position = {
          x: Math.floor(current.x) + dir.x,
          y: Math.floor(current.y) + dir.y
        };
        const nextKey = getKey(next);

        if (isValidMove(next.x, next.y, maze) && !visited.has(nextKey)) {
          queue.push(next);
          visited.add(nextKey);
          parent.set(nextKey, current);
        }
      }
    }

    return [];
  };

  useEffect(() => {
    if (gameOver) {
      setHighScore(prev => Math.max(prev, score));
    }
  }, [gameOver]);

  useEffect(() => {
    Animated.timing(playerPosition, {
      toValue: { x: player.x * CELL_SIZE, y: player.y * CELL_SIZE },
      duration: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic)
    }).start();

    let rotationValue = 0;
    if (direction.x === 1) rotationValue = 90;
    else if (direction.x === -1) rotationValue = 270;
    else if (direction.y === 1) rotationValue = 180;
    else if (direction.y === -1) rotationValue = 0;

    Animated.timing(playerRotation, {
      toValue: rotationValue,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic)
    }).start();
    
    // Karakterin pürüzsüz yürümesini sağlayan animasyon
    Animated.sequence([
      Animated.timing(playerScale, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: false,
        easing: Easing.inOut(Easing.sin)
      }),
      Animated.timing(playerScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
        easing: Easing.inOut(Easing.sin)
      })
    ]).start();
  }, [player]);

  useEffect(() => {
    enemies.forEach((enemy, index) => {
      if (enemyPositions[index]) {
        Animated.timing(enemyPositions[index], {
          toValue: { x: enemy.position.x * CELL_SIZE, y: enemy.position.y * CELL_SIZE },
          duration: 300,
          useNativeDriver: false,
          easing: Easing.linear
        }).start();
      }
    });
  }, [enemies]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: false,
        easing: Easing.elastic(2)
      }),
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      })
    ]).start();
  }, [score]);

  useEffect(() => {
    if (isMoving) {
      // Yürüme animasyonu - hafif yumuşak hareket
      const walkingAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(playerScale, {
              toValue: 1.05,
              duration: 200,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.sin)
            }),
            Animated.timing(playerScale, {
              toValue: 0.95,
              duration: 200,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.sin)
            })
          ])
        ).start();
      };
      
      walkingAnimation();
    } else {
      playerScale.setValue(1);
    }

    return () => {
      playerScale.stopAnimation();
      playerScale.setValue(1);
    };
  }, [isMoving]);

  useEffect(() => {
    if (!gameOver && !won && isMoving) {
      const moveInterval = setInterval(() => {
        if (isMoving) {
          const newX = player.x + direction.x;
          const newY = player.y + direction.y;

          if (isValidMove(newX, newY, maze)) {
            setPlayer({ x: newX, y: newY });

            if (maze[Math.floor(newY)][Math.floor(newX)] === 2) {
              // Kapıya ulaşıldığında
              setScore(prev => prev + (level * 100));
              setLevel(prev => prev + 1);
              const newMaze = createMaze();
              setMaze(newMaze);
              setPlayer({ x: 1, y: 1 });
              setTimeLeft(prev => Math.min(prev + 30, GAME_TIME));
              const newEnemies = createEnemies(
                { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
                newMaze,
                { x: 1, y: 1 }
              );
              setEnemies(newEnemies);
              
              newEnemies.forEach((_, index) => {
                if (index < enemyPositions.length) {
                  enemyPositions[index].setValue({ x: newEnemies[index].position.x * CELL_SIZE, y: newEnemies[index].position.y * CELL_SIZE });
                }
              });
              
              setDirection({ x: 0, y: 1 });
              setIsMoving(false);
            }
          } else {
            Animated.sequence([
              Animated.timing(playerScale, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: false
              }),
              Animated.timing(playerScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: false
              })
            ]).start();
            
            setDirection({ x: -direction.x, y: -direction.y });
          }
        }
      }, 200);

      return () => clearInterval(moveInterval);
    }
  }, [player, direction, isMoving, gameOver, won, maze, level]);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (!gameOver && !won) {
        setEnemies(prevEnemies => 
          prevEnemies.map((enemy, index) => {
            const dx = Math.abs(enemy.position.x - player.x);
            const dy = Math.abs(enemy.position.y - player.y);
            if (dx < 0.8 && dy < 0.8) {
              setGameOver(true);
              setIsMoving(false);
              return enemy;
            }

            // Daha akıllı düşman hareketi: En kısa yolu bulmaya çalış
            const currentX = Math.floor(enemy.position.x);
            const currentY = Math.floor(enemy.position.y);
            const playerGridX = Math.floor(player.x);
            const playerGridY = Math.floor(player.y);
            
            // Takip mesafesini artırdık ve her zaman takip etmesini sağladık
            const followPlayer = Math.sqrt(
              Math.pow(currentX - playerGridX, 2) + 
              Math.pow(currentY - playerGridY, 2)
            ) < 10;
            
            if (followPlayer) {
              // A* benzeri hareket - oyuncuya en yakın yolu bul
              const path = findPath(
                { x: currentX, y: currentY }, 
                { x: playerGridX, y: playerGridY }
              );
              
              if (path.length > 0) {
                // Bir sonraki adımı al
                const nextStep = path[0];
                return {
                  position: { x: nextStep.x, y: nextStep.y },
                  direction: {
                    x: Math.sign(nextStep.x - currentX),
                    y: Math.sign(nextStep.y - currentY)
                  }
                };
              }
            }
            
            // Eğer takip etmezse veya yol bulunamazsa, oyuncuya doğru hareket et
            const availableDirections = [
              { x: 1, y: 0 },   // Sağ
              { x: -1, y: 0 },  // Sol
              { x: 0, y: 1 },   // Aşağı
              { x: 0, y: -1 }   // Yukarı
            ].filter(dir => 
              isValidMove(currentX + dir.x, currentY + dir.y, maze)
            );

            if (availableDirections.length > 0) {
              // Oyuncuya doğru hareket et
              const bestDirection = availableDirections.reduce((best, current) => {
                const currentDist = Math.sqrt(
                  Math.pow(currentX + current.x - playerGridX, 2) + 
                  Math.pow(currentY + current.y - playerGridY, 2)
                );
                const bestDist = Math.sqrt(
                  Math.pow(currentX + best.x - playerGridX, 2) + 
                  Math.pow(currentY + best.y - playerGridY, 2)
                );
                return currentDist < bestDist ? current : best;
              });

              return {
                position: { 
                  x: currentX + bestDirection.x,
                  y: currentY + bestDirection.y
                },
                direction: bestDirection
              };
            }

            return enemy;
          })
        );
      }
    }, 150);

    return () => clearInterval(gameLoop);
  }, [player, gameOver, won, maze, level]);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setEnemyBlinking(prev => !prev);
    }, 500);

    return () => clearInterval(blinkTimer);
  }, []);

  useEffect(() => {
    // Ağız animasyonu - sürekli açılıp kapanacak
    const startMouthAnimation = () => {
      Animated.sequence([
        Animated.timing(mouthAngleAnim, {
          toValue: 45,
          duration: 300,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(mouthAngleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        })
      ]).start(() => {
        if (!gameOver && !won) {
          startMouthAnimation();
        }
      });
    };

    // Parlama efekti animasyonu
    const startGlowAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(playerGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false
          }),
          Animated.timing(playerGlowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false
          })
        ])
      ).start();
    };

    startMouthAnimation();
    startGlowAnimation();
    
    return () => {
      mouthAngleAnim.stopAnimation();
      playerGlowAnim.stopAnimation();
    };
  }, [gameOver, won]);

  const changeDirection = (dx: number, dy: number) => {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isValidMove(newX, newY, maze)) {
      setDirection({ x: dx, y: dy });
      setIsMoving(true);
      
      // Yön değiştirirken hafif bir hareket efekti
      Animated.sequence([
        Animated.timing(playerScale, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(playerScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
          easing: Easing.in(Easing.cubic)
        })
      ]).start();
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const { dx, dy } = gestureState;
      const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
      
      // Hareket hassasiyetini artırdık
      if (isHorizontalSwipe) {
        if (dx > 5) { // Eşik değerini düşürdük
          changeDirection(1, 0);
        } else if (dx < -5) { // Eşik değerini düşürdük
          changeDirection(-1, 0);
        }
      } else {
        if (dy > 5) { // Eşik değerini düşürdük
          changeDirection(0, 1);
        } else if (dy < -5) { // Eşik değerini düşürdük
          changeDirection(0, -1);
        }
      }
    },
    onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const now = Date.now();
      if (now - lastSwipeTime < 50) return; // Süreyi düşürdük
      setLastSwipeTime(now);
    }
  });

  const restartGame = () => {
    const newMaze = createMaze();
    setMaze(newMaze);

    const getRandomPosition = () => {
      let x, y;
      do {
        x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      } while (newMaze[y][x] !== 0);
      return { x, y };
    };

    const playerStartPos = getRandomPosition();
    setPlayer(playerStartPos);
    setTimeLeft(GAME_TIME);
    
    playerPosition.setValue({ x: playerStartPos.x * CELL_SIZE, y: playerStartPos.y * CELL_SIZE });
    playerRotation.setValue(0);
    playerScale.setValue(1);
    
    const exitPosition = newMaze.findIndex(row => row.includes(2));
    const newEnemies = createEnemies(
      { x: exitPosition % GRID_SIZE, y: Math.floor(exitPosition / GRID_SIZE) },
      newMaze,
      playerStartPos
    );
    setEnemies(newEnemies);
    
    newEnemies.forEach((enemy, index) => {
      if (index < enemyPositions.length) {
        enemyPositions[index].setValue({ x: enemy.position.x * CELL_SIZE, y: enemy.position.y * CELL_SIZE });
      }
    });
    
    setGameOver(false);
    setWon(false);
    setScore(0);
    setLevel(1);
    setDirection({ x: 0, y: 1 });
    setIsMoving(false);
  };

  const interpolatedRotation = playerRotation.interpolate({
    inputRange: [0, 90, 180, 270, 360],
    outputRange: ['0deg', '90deg', '180deg', '270deg', '360deg'],
  });

  const interpolatedMouthAngle = mouthAngleAnim.interpolate({
    inputRange: [0, 45],
    outputRange: ['0deg', '5deg'],
  });

  const interpolatedGlow = playerGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 8]
  });

  return (
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.header, { transform: [{ scale: scoreAnim }] }]}>
        <Text style={styles.score}>Seviye: {level}</Text>
        <Animated.Text style={[styles.score, timeLeft <= 10 ? {color: '#ff0000', transform: [{scale: timerAnim}]} : null]}>
          Süre: {timeLeft}
        </Animated.Text>
        <Text style={styles.score}>Skor: {score}</Text>
      </Animated.View>
      
      <View style={styles.maze}>
        {maze.map((row, y) => (
          <View key={y} style={styles.row}>
            {row.map((cell, x) => (
              <View
                key={`${x}-${y}`}
                style={[
                  styles.cell,
                  cell === 1 ? styles.wall : cell === 2 ? styles.exit : styles.path
                ]}
              >
                {cell === 2 && (
                  <Animated.View style={[styles.exitDoor, { 
                    transform: [
                      { rotate: '360deg' },
                      { scale: playerScale }
                    ] 
                  }]}>
                    <Text style={styles.exitText}>🚪</Text>
                  </Animated.View>
                )}
              </View>
            ))}
          </View>
        ))}
        
        {enemies.map((enemy, index) => (
          <Animated.View
            key={`enemy-${index}`}
            style={[
              styles.enemy,
              {
                left: enemyPositions[index]?.x || enemy.position.x * CELL_SIZE,
                top: enemyPositions[index]?.y || enemy.position.y * CELL_SIZE,
                transform: [{ scale: 0.8 }]
              }
            ]}
          >
            {/* Düşman gözleri */}
            <View style={styles.enemyEyesContainer}>
              <View style={[styles.enemyEye, enemyBlinking && styles.enemyEyeBlinking]} />
              <View style={[styles.enemyEye, enemyBlinking && styles.enemyEyeBlinking]} />
            </View>
            <View style={styles.enemyMouth} />
          </Animated.View>
        ))}
        
        <Animated.View
          style={[
            styles.player,
            {
              left: playerPosition.x,
              top: playerPosition.y,
              shadowRadius: interpolatedGlow,
              borderWidth: 2,
              borderColor: '#ffec8b',
              transform: [
                { scale: playerScale }
              ]
            }
          ]}
        >
          <View style={styles.playerInner}>
            <View style={[styles.playerLeftEye, styles.playerEye]}>
              <View style={styles.playerEyePupil} />
            </View>
            <View style={[styles.playerRightEye, styles.playerEye]}>
              <View style={styles.playerEyePupil} />
            </View>
            <View style={[styles.enemyMouth, { backgroundColor: '#ffff' }]} />
          </View>
        </Animated.View>
      </View>
      
      <Text style={styles.instructions}>
        Ekranın herhangi bir yerinde kaydırarak karakteri hareket ettirin
      </Text>
      
      {gameOver && (
        <View style={styles.overlay}>
          <Animated.Text style={[styles.overlayText, { transform: [{ scale: scoreAnim }] }]}>
            Oyun Bitti!
          </Animated.Text>
          <Text style={styles.overlayScore}>Seviye: {level}</Text>
          <Text style={styles.overlayScore}>Skor: {score}</Text>
          <Text style={styles.overlayScore}>En Yüksek Skor: {highScore}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
            <Text style={styles.restartText}>Tekrar Oyna</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e272e',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 50
  },
  score: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  maze: {
    width: GRID_SIZE * CELL_SIZE,
    height: GRID_SIZE * CELL_SIZE,
    backgroundColor: '#2d3436',
    position: 'relative'
  },
  row: {
    flexDirection: 'row'
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#2d3436'
  },
  wall: {
    backgroundColor: '#636e72'
  },
  path: {
    backgroundColor: '#2d3436'
  },
  exit: {
    backgroundColor: '#00b894',
    borderWidth: 2,
    borderColor: '#ffeaa7'
  },
  food: {
    backgroundColor: '#2d3436',
  },
  foodDot: {
    position: 'absolute',
    width: CELL_SIZE / 4,
    height: CELL_SIZE / 4,
    backgroundColor: '#fdcb6e',
    borderRadius: CELL_SIZE / 4,
    top: CELL_SIZE / 2 - CELL_SIZE / 8,
    left: CELL_SIZE / 2 - CELL_SIZE / 8,
  },
  exitDoor: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00b894',
    borderRadius: CELL_SIZE / 4,
    borderWidth: 2,
    borderColor: '#ffeaa7',
  },
  exitText: {
    fontSize: 20
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#ffce00', // Daha parlak sarı
    borderRadius: PLAYER_SIZE / 2,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    elevation: 10,
    overflow: 'visible'
  },
  playerInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  playerEye: {
    position: 'absolute',
    width: PLAYER_SIZE * 0.25,
    height: PLAYER_SIZE * 0.25,
    backgroundColor: 'white',
    borderRadius: PLAYER_SIZE * 0.125,
    borderWidth: 2,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center'
  },
  playerLeftEye: {
    top: PLAYER_SIZE * 0.18,
    left: PLAYER_SIZE * 0.18,
  },
  playerRightEye: {
    top: PLAYER_SIZE * 0.18,
    right: PLAYER_SIZE * 0.18,
  },
  playerEyePupil: {
    width: PLAYER_SIZE * 0.12,
    height: PLAYER_SIZE * 0.12,
    backgroundColor: 'black',
    borderRadius: PLAYER_SIZE * 0.06,
    borderWidth: 1,
    borderColor: 'white',
  },
  playerMouth: {
    position: 'absolute',
    bottom: PLAYER_SIZE * 0.15,
    width: PLAYER_SIZE * 0.5,
    height: PLAYER_SIZE * 0.25,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1e272e',
    borderRadius: PLAYER_SIZE * 0.15,
    borderTopColor: 'transparent',
  },
  enemy: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#d63031',
    borderRadius: PLAYER_SIZE / 2,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  enemyEyesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: PLAYER_SIZE * 0.6,
    position: 'absolute',
    top: PLAYER_SIZE * 0.2
  },
  enemyEye: {
    width: PLAYER_SIZE * 0.2,
    height: PLAYER_SIZE * 0.2,
    backgroundColor: 'white',
    borderRadius: PLAYER_SIZE * 0.1,
    borderWidth: 1,
    borderColor: 'black'
  },
  enemyEyeBlinking: {
    height: PLAYER_SIZE * 0.05,
    backgroundColor: 'black'
  },
  enemyMouth: {
    position: 'absolute',
    top: PLAYER_SIZE * 0.55,
    width: PLAYER_SIZE * 0.5,
    height: PLAYER_SIZE * 0.2,
    backgroundColor: 'black',
    borderBottomLeftRadius: PLAYER_SIZE * 0.2,
    borderBottomRightRadius: PLAYER_SIZE * 0.2
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlayText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20
  },
  overlayScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 10
  },
  restartButton: {
    backgroundColor: '#0984e3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20
  },
  restartText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
});

