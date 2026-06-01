"use client";

import Image from "next/image";
import { m } from "motion/react";

const teamMembers = [
  {
    image: "/images/team/rizky.jpeg",
    linkedin: "https://www.linkedin.com/in/rizki-pangestu-a52200318/",
    name: "Rizki Pangestu",
    role: "Data Scientist",
  },
  {
    image: "/images/team/rama.jpeg",
    linkedin: "https://www.linkedin.com/in/ramadanadipa/",
    name: "Rama Danadipa Putra Wijaya",
    role: "Fullstack Developer",
  },
  {
    image: "/images/team/panji.png",
    linkedin: "https://www.linkedin.com/in/panjiihsanudinfajri/",
    name: "Panji Ihsanudin Fajri",
    role: "Fullstack Developer",
  },
  {
    image: "/images/team/rayan.jpeg",
    linkedin: "https://www.linkedin.com/in/la-rayan-768039389/",
    name: "La Rayan",
    role: "Data Scientist",
  },
  {
    image: "/images/team/alfito.jpeg",
    linkedin: "https://www.linkedin.com/in/alfito-juanda/",
    name: "Alfito Juanda",
    role: "AI Engineer",
  },
  {
    image: "/images/team/hanif.jpeg",
    linkedin: "https://www.linkedin.com/in/hanif-rifan/",
    name: "Hanif Rifan",
    role: "AI Engineer",
  },
] as const;

const sliderItems = [...teamMembers, ...teamMembers];

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5 fill-current text-primary" viewBox="0 0 24 24">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export default function Component() {
  return (
    <m.div
      className="team-slider relative left-1/2 w-[116vw] -translate-x-1/2 overflow-hidden py-4 sm:w-[112vw] sm:py-6 lg:w-[108vw] lg:py-8"
      initial={{ opacity: 0, y: 34, scale: 0.985 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, amount: 0.28 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-28 lg:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-28 lg:w-40" />

      <div className="team-slider-track flex w-max gap-4 pr-4 sm:gap-5 sm:pr-5 lg:gap-6 lg:pr-6">
        {sliderItems.map((member, index) => (
          <m.article
            className="team-card group/card flex w-48 shrink-0 flex-col sm:w-56 md:w-64 lg:w-72"
            initial={{ opacity: 0, y: 26, rotate: -1.2 }}
            key={`${member.name}-${index}`}
            transition={{ duration: 0.65, delay: (index % teamMembers.length) * 0.055, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          >
            <div className="relative h-[18rem] w-full overflow-hidden rounded-[2rem] bg-surface shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-line sm:h-[21rem] md:h-[24rem] lg:h-[28rem]">
              <Image
                alt={member.name}
                className="team-member-image h-full w-full object-cover object-center transition-all duration-500 group-hover/card:scale-105"
                fill
                sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
                src={member.image}
              />
              <div className="absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-primary px-4 py-3 text-left shadow-[0_-10px_34px_rgba(20,114,69,0.18)] ring-1 ring-white/20 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-[12px] font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-[13px] md:text-sm">
                      {member.name}
                    </h3>
                    <p className="mt-1 truncate text-[9px] font-extrabold uppercase leading-tight tracking-[0.14em] text-white/82 sm:text-[10px] md:text-[11px]">
                      {member.role}
                    </p>
                  </div>
                  <a
                    aria-label={`Cari ${member.name} di LinkedIn`}
                    className="group/linkedin grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-primary shadow-[0_8px_18px_rgba(15,23,42,0.16)] ring-1 ring-white/70 transition-transform duration-200 hover:scale-110 hover:bg-white hover:text-primary sm:h-7 sm:w-7"
                    href={member.linkedin}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <LinkedInIcon />
                  </a>
                </div>
              </div>
            </div>
          </m.article>
        ))}
      </div>
    </m.div>
  );
}
