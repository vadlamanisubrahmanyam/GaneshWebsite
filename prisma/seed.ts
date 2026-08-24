import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const carReviews = await prisma.topic.create({
    data: { title: "Car Reviews", description: "2024 model comparisons, owner reviews, reliability talk.", followerCount: 1200 },
  });
  const homeCooking = await prisma.topic.create({
    data: { title: "Home Cooking", description: "Recipes, technique questions, kitchen gear.", followerCount: 860 },
  });
  const tech = await prisma.topic.create({
    data: { title: "Tech & Gadgets", description: "Phones, laptops, smart home, first impressions.", followerCount: 3100 },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", name: "Priya S.", role: "USER" },
  });

  await prisma.blog.create({
    data: {
      title: "Living with a hybrid for 100k miles",
      body: "Placeholder article body...",
      topicId: carReviews.id,
      authorId: demoUser.id,
    },
  });
  await prisma.blog.create({
    data: {
      title: "Six months with the new ultrabook lineup",
      body: "Placeholder article body...",
      topicId: tech.id,
      authorId: demoUser.id,
    },
  });

  await prisma.qAItem.create({
    data: {
      type: "QUESTION",
      title: "How reliable is the hybrid engine after 100k miles?",
      topicId: carReviews.id,
      authorId: demoUser.id,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
